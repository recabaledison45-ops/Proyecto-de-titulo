from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from shared import notifications
from shared.exceptions import Conflict

from .gateways import get_gateway
from .models import Payment

CENT = Decimal("0.01")


def calculate_split(amount):
    """Comisión de plataforma y pago neto al anfitrión."""
    amount = Decimal(amount)
    fee = (amount * settings.PLATFORM_FEE_PERCENT / Decimal(100)).quantize(CENT, rounding=ROUND_HALF_UP)
    return fee, amount - fee


def payment_info(*, booking, user):
    if booking.guest_id != user.id:
        raise PermissionDenied("Solo el huésped de la reserva puede ver los datos de pago.")
    return {
        "amount": str(booking.total_price),
        "reference": f"WEXP-{booking.pk}",
        "bank_details": booking.listing.host.bank_details,
    }


def create_payment(*, guest, booking_id):
    with transaction.atomic():
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
        if Payment.objects.filter(booking=booking).exists():
            raise Conflict("Ya existe un pago registrado para esta reserva.")

        gateway = get_gateway()
        result = gateway.charge(booking=booking, amount=booking.total_price)  # puede lanzar 402
        fee, payout = calculate_split(booking.total_price)
        now = timezone.now()
        paid = result.status == Payment.Status.SUCCEEDED
        payment = Payment.objects.create(
            booking=booking, amount=booking.total_price, platform_fee=fee, host_payout=payout,
            status=result.status, method=gateway.method, gateway_reference=result.reference,
            reported_at=None if paid else now, confirmed_at=now if paid else None,
        )
        if paid:
            booking_services.confirm_booking(booking=booking)
    return payment


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
    if payment.status == Payment.Status.SUCCEEDED:
        gateway = get_gateway(payment.method)
        payment.gateway_reference = gateway.refund(payment=payment) or payment.gateway_reference
        payment.status = Payment.Status.REFUNDED
        payment.refunded_at = timezone.now()
        payment.save()
    elif payment.status == Payment.Status.REPORTED:
        payment.status = Payment.Status.FAILED
        payment.save()
