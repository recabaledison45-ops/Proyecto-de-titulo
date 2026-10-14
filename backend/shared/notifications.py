"""Correos transaccionales. Un fallo de envío se registra pero NUNCA rompe la operación."""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

logger = logging.getLogger(__name__)


def send_safe(subject, body, recipients):
    recipients = [r for r in recipients if r]
    if not recipients:
        return False
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=False)
        return True
    except Exception:  # noqa: BLE001 - el correo no puede romper la reserva
        logger.exception("No se pudo enviar el correo %r a %s", subject, recipients)
        return False


def notify_on_commit(func, *args):
    """Ejecuta el envío solo si la transacción se confirma."""
    transaction.on_commit(lambda: func(*args))


def _summary(b):
    return (
        f"Oferta: {b.listing.title} ({b.listing.city})\n"
        f"Fechas: {b.check_in} → {b.check_out}\n"
        f"Personas: {b.guests}\n"
        f"Total: ${b.total_price}\n"
        f"Estado: {b.get_status_display()}\n"
    )


def booking_created(booking_id):
    from apps.bookings.selectors import get_booking

    b = get_booking(booking_id)
    send_safe(
        f"Reserva #{b.pk} recibida: {b.listing.title}",
        f"Hola {b.guest.username},\n\nRecibimos tu reserva. Queda pendiente hasta que se confirme el pago "
        f"(vence {b.expires_at:%d-%m-%Y %H:%M}).\n\n{_summary(b)}\nMis reservas: {settings.FRONTEND_URL}/bookings\n",
        [b.guest.email],
    )
    send_safe(
        f"Nueva reserva #{b.pk} en {b.listing.title}",
        f"{b.guest.username} reservó tu oferta.\n\n{_summary(b)}\nGestiónala en: {settings.FRONTEND_URL}/account\n",
        [b.listing.host.email],
    )


def booking_confirmed(booking_id):
    from apps.bookings.selectors import get_booking

    b = get_booking(booking_id)
    send_safe(
        f"Reserva #{b.pk} confirmada",
        f"Tu reserva fue confirmada. ¡Te esperamos!\n\n{_summary(b)}",
        [b.guest.email],
    )


def booking_cancelled(booking_id):
    from apps.bookings.selectors import get_booking

    b = get_booking(booking_id)
    reason = f"\nMotivo: {b.cancel_reason}\n" if b.cancel_reason else ""
    body = f"La reserva #{b.pk} quedó en estado «{b.get_status_display()}».{reason}\n{_summary(b)}"
    send_safe(f"Reserva #{b.pk} {b.get_status_display().lower()}", body, [b.guest.email, b.listing.host.email])
