import logging
import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from shared import notifications
from shared.exceptions import Conflict, ServiceUnavailable

from .gateways import get_gateway
from .models import Payment
from .webpay import WebpayClient, WebpayError, is_approved

logger = logging.getLogger(__name__)
CENT = Decimal("0.01")
# Un pago en estos estados se puede reintentar (con tarjeta o por transferencia).
RETRYABLE = (Payment.Status.PENDING, Payment.Status.FAILED, Payment.Status.REFUNDED)


def calculate_split(amount):
    """Comisión de plataforma y pago neto al anfitrión."""
    amount = Decimal(amount)
    fee = (amount * settings.PLATFORM_FEE_PERCENT / Decimal(100)).quantize(CENT, rounding=ROUND_HALF_UP)
    return fee, amount - fee


def payment_info(*, booking, user):
    if booking.guest_id != user.id:
        raise PermissionDenied("Solo el huésped de la reserva puede ver los datos de pago.")
    methods = ["webpay"] if settings.WEBPAY_ENABLED else []
    methods.append(settings.PAYMENT_GATEWAY)
    return {
        "amount": str(booking.total_price),
        "reference": f"WEXP-{booking.pk}",
        "bank_details": booking.listing.host.bank_details,
        "methods": methods,
        "webpay_test_mode": settings.WEBPAY_ENABLED and settings.WEBPAY_ENV == "integration",
    }


def _payable_booking(*, guest, booking_id):
    """Reserva bloqueada y validada para pagar, más su pago previo reintentable (o None). Dentro de una transacción."""
    try:
        booking = Booking.objects.select_for_update().get(pk=booking_id)
    except Booking.DoesNotExist as exc:
        raise NotFound("Reserva no encontrada.") from exc
    if booking.guest_id != guest.id:
        raise PermissionDenied("Solo el huésped puede pagar su reserva.")
    if booking.status != Booking.Status.PENDING:
        raise Conflict("La reserva no está pendiente de pago.")
    if booking.expires_at and booking.expires_at <= timezone.now():
        raise Conflict("La reserva expiró por falta de pago; debe reservar nuevamente.")
    previous = Payment.objects.select_for_update().filter(booking=booking).first()
    if previous is not None and previous.status not in RETRYABLE:
        raise Conflict("Ya existe un pago registrado para esta reserva.")
    return booking, previous


def create_payment(*, guest, booking_id):
    """Pago con la pasarela configurada en PAYMENT_GATEWAY (transferencia informada o simulada)."""
    with transaction.atomic():
        booking, previous = _payable_booking(guest=guest, booking_id=booking_id)
        gateway = get_gateway()
        result = gateway.charge(booking=booking, amount=booking.total_price)  # puede lanzar 402
        fee, payout = calculate_split(booking.total_price)
        now = timezone.now()
        paid = result.status == Payment.Status.SUCCEEDED
        payment = previous or Payment(booking=booking)
        payment.amount, payment.platform_fee, payment.host_payout = booking.total_price, fee, payout
        payment.status, payment.method, payment.gateway_reference = result.status, gateway.method, result.reference
        payment.gateway_token, payment.buy_order, payment.gateway_payload = "", "", {}
        payment.reported_at, payment.confirmed_at = (None if paid else now), (now if paid else None)
        payment.save()
        if paid:
            booking_services.confirm_booking(booking=booking)
    return payment


# ----------------------------------------------------------------------------- Webpay Plus (tarjeta)
def start_webpay(*, guest, booking_id, return_url):
    """Inicia el pago con tarjeta. Devuelve (payment, url) y el navegador debe ir a `url` con `token_ws`."""
    if not settings.WEBPAY_ENABLED:
        raise NotFound("El pago con tarjeta no está habilitado.")
    with transaction.atomic():
        booking, previous = _payable_booking(guest=guest, booking_id=booking_id)
        amount = booking.total_price
        if amount != amount.to_integral_value() or amount <= 0:
            raise Conflict("El monto de la reserva no es válido para pago con tarjeta (CLP sin decimales).")
        buy_order = f"WEXP-{booking.pk}-{uuid.uuid4().hex[:8].upper()}"[:26]
        try:
            created = WebpayClient().create(
                buy_order=buy_order, session_id=f"guest-{guest.pk}", amount=int(amount), return_url=return_url,
            )
        except WebpayError as exc:
            raise ServiceUnavailable() from exc
        fee, payout = calculate_split(amount)
        payment = previous or Payment(booking=booking)
        payment.amount, payment.platform_fee, payment.host_payout = amount, fee, payout
        payment.status, payment.method = Payment.Status.PENDING, Payment.Method.WEBPAY
        payment.gateway_token, payment.buy_order = created["token"], buy_order
        payment.gateway_reference, payment.gateway_payload = "", {}
        payment.reported_at = payment.confirmed_at = None
        payment.save()
    return payment, created["url"]


def finish_webpay(*, token):
    """Retorno normal desde Webpay: confirma el cargo y, si fue aprobado, confirma la reserva.

    Es idempotente: si el navegador repite el retorno, devuelve el pago ya resuelto.
    Devuelve (payment | None, resultado) con resultado en: success, failed, refunded, error.
    """
    with transaction.atomic():
        payment = Payment.objects.select_for_update().filter(gateway_token=token, method=Payment.Method.WEBPAY).first()
        if payment is None or not token:
            return None, "error"
        if payment.status == Payment.Status.SUCCEEDED:
            return payment, "success"
        if payment.status != Payment.Status.PENDING:
            return payment, "refunded" if payment.status in (Payment.Status.REFUNDED, Payment.Status.REFUND_PENDING) else "failed"
        booking = Booking.objects.select_for_update().get(pk=payment.booking_id)

        client = WebpayClient()
        try:
            detail = client.commit(token)
        except WebpayError:
            # Puede que la confirmación SÍ se haya hecho y solo se perdiera la respuesta (corte de red, retorno repetido):
            # se consulta el estado. Si no está autorizada no hay cargo (Transbank reversa sola) y queda pendiente.
            try:
                detail = client.status(token)
            except WebpayError:
                return payment, "error"
            if not is_approved(detail):
                return payment, "error"
        payment.gateway_payload = detail

        consistent = detail.get("buy_order") == payment.buy_order and Decimal(str(detail.get("amount", -1))) == payment.amount
        if not is_approved(detail):
            payment.status = Payment.Status.FAILED
            payment.save()
            return payment, "failed"

        still_payable = booking.status == Booking.Status.PENDING and not (booking.expires_at and booking.expires_at <= timezone.now())
        if not consistent or not still_payable:
            # Cargo aprobado que no podemos aceptar (la reserva venció o se canceló mientras pagaba, o datos inconsistentes):
            # se devuelve el dinero de inmediato.
            logger.warning("Webpay: cargo aprobado no aceptable para el pago %s (consistente=%s); se reversa.", payment.pk, consistent)
            _refund_webpay(payment, client)
            return payment, "refunded"

        payment.status = Payment.Status.SUCCEEDED
        payment.confirmed_at = timezone.now()
        payment.gateway_reference = f"WEBPAY-{detail.get('authorization_code', '')}"
        payment.save()
        booking_services.confirm_booking(booking=booking)
    return payment, "success"


def abort_webpay(*, token="", buy_order=""):
    """El huésped anuló en el formulario de Webpay (llega TBK_TOKEN) o se agotó el tiempo (solo TBK_ORDEN_COMPRA)."""
    with transaction.atomic():
        query = Payment.objects.select_for_update().filter(method=Payment.Method.WEBPAY, status=Payment.Status.PENDING)
        payment = (query.filter(gateway_token=token).first() if token else None) or (
            query.filter(buy_order=buy_order).first() if buy_order else None
        )
        if payment is not None:
            payment.status = Payment.Status.FAILED
            payment.save()
    return payment


def _refund_webpay(payment, client=None):
    """Devuelve un cargo de Webpay. Si Transbank no lo acepta, queda marcado para reembolso manual."""
    try:
        result = (client or WebpayClient()).refund(payment.gateway_token, int(payment.amount))
    except WebpayError:
        logger.error("Webpay: no se pudo reembolsar el pago %s; requiere gestión manual.", payment.pk)
        payment.status = Payment.Status.REFUND_PENDING
    else:
        payment.status = Payment.Status.REFUNDED
        payment.refunded_at = timezone.now()
        payment.gateway_reference = f"WEBPAY-{result.get('type', 'REFUND')}"
    payment.save()


def confirm_payment(*, payment_id, actor):
    with transaction.atomic():
        try:
            payment = Payment.objects.select_for_update().get(pk=payment_id)
        except Payment.DoesNotExist as exc:
            raise NotFound("Pago no encontrado.") from exc
        booking = Booking.objects.select_for_update().select_related("listing").get(pk=payment.booking_id)
        if not booking_services.is_host_or_staff(actor, booking):
            raise PermissionDenied("Solo el anfitrión puede confirmar el pago.")
        if payment.status != Payment.Status.REPORTED:
            raise Conflict("El pago no está pendiente de confirmación.")
        if booking.status != Booking.Status.PENDING:
            raise Conflict("La reserva ya no está pendiente.")
        payment.platform_fee, payment.host_payout = calculate_split(payment.amount)
        payment.status = Payment.Status.SUCCEEDED
        payment.confirmed_at = timezone.now()
        payment.save()
        booking_services.confirm_booking(booking=booking)
    return payment


def handle_booking_closed(booking):
    """Receiver de booking_cancelled: reembolsa pagos confirmados; descarta los informados."""
    payment = Payment.objects.filter(booking=booking).first()
    if payment is None:
        return
    if payment.status == Payment.Status.SUCCEEDED and payment.method == Payment.Method.WEBPAY:
        _refund_webpay(payment)  # nunca bloquea la cancelación: si falla queda "reembolso pendiente"
    elif payment.status == Payment.Status.SUCCEEDED:
        gateway = get_gateway(payment.method)
        payment.gateway_reference = gateway.refund(payment=payment) or payment.gateway_reference
        payment.status = Payment.Status.REFUNDED
        payment.refunded_at = timezone.now()
        payment.save()
    elif payment.status in (Payment.Status.REPORTED, Payment.Status.PENDING):
        payment.status = Payment.Status.FAILED
        payment.save()
