"""Reglas de negocio de reservas: anti doble reserva, máquina de estados, expiración."""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.listings.models import BookingMode, Listing
from shared import notifications
from shared.exceptions import Conflict

from . import selectors
from .models import Booking
from .signals import booking_cancelled

S = Booking.Status

TRANSITIONS = {
    S.PENDING: {S.CONFIRMED, S.REJECTED, S.CANCELLED},
    S.CONFIRMED: {S.CANCELLED, S.COMPLETED},
    S.REJECTED: set(),
    S.CANCELLED: set(),
    S.COMPLETED: set(),
}


def _transition(booking, new_status):
    if new_status not in TRANSITIONS.get(booking.status, set()):
        raise Conflict(
            f"No se puede pasar de «{booking.get_status_display()}» a «{S(new_status).label}»."
        )
    booking.status = new_status


def _lock(booking_id):
    # Sin select_related: PostgreSQL no permite FOR UPDATE sobre el lado nulo de un outer join.
    try:
        return Booking.objects.select_for_update().get(pk=booking_id)
    except Booking.DoesNotExist as exc:
        raise NotFound("Reserva no encontrada.") from exc


def is_host_or_staff(user, booking):
    return user.is_staff or booking.listing.host_id == user.id


def create_booking(*, guest, listing_id, check_in, check_out, guests):
    today = timezone.localdate()
    if check_out <= check_in:
        raise ValidationError({"check_out": ["La salida debe ser posterior a la llegada."]})
    if check_in < today:
        raise ValidationError({"check_in": ["No se puede reservar en fechas pasadas."]})
    if guests < 1:
        raise ValidationError({"guests": ["Debe haber al menos una persona."]})

    with transaction.atomic():
        try:
            listing = Listing.objects.select_for_update().get(pk=listing_id)  # bloquea la oferta
        except Listing.DoesNotExist as exc:
            raise NotFound("Oferta no encontrada.") from exc
        if not listing.is_active:
            raise ValidationError({"listing": ["La oferta no está disponible."]})
        if listing.host_id == guest.id:
            raise PermissionDenied("El anfitrión no puede reservar su propia oferta.")
        if guests > listing.max_guests:
            raise ValidationError({"guests": [f"La capacidad máxima es de {listing.max_guests} personas."]})

        nights = (check_out - check_in).days
        if listing.booking_mode == BookingMode.SHARED:
            if selectors.peak_occupancy(listing, check_in, check_out) + guests > listing.max_guests:
                raise Conflict("No quedan cupos suficientes para esas fechas.")
            total = listing.price_per_night * nights * guests
        else:
            if selectors.exclusive_conflict_exists(listing, check_in, check_out):
                raise Conflict("Las fechas seleccionadas ya están ocupadas.")
            total = listing.price_per_night * nights

        booking = Booking.objects.create(
            listing=listing, guest=guest, check_in=check_in, check_out=check_out, guests=guests,
            total_price=total, status=S.PENDING,
            expires_at=timezone.now() + timedelta(hours=settings.BOOKING_PENDING_HOURS),
        )
        notifications.notify_on_commit(notifications.booking_created, booking.pk)
    return booking


def confirm_booking(*, booking):
    """Usado por payments al confirmar el pago."""
    _transition(booking, S.CONFIRMED)
    booking.expires_at = None
    booking.save(update_fields=["status", "expires_at", "updated_at"])
    notifications.notify_on_commit(notifications.booking_confirmed, booking.pk)
    return booking


def _close(booking, new_status, reason):
    _transition(booking, new_status)
    booking.cancel_reason = reason[:255]
    booking.save(update_fields=["status", "cancel_reason", "updated_at"])
    booking_cancelled.send(sender=Booking, booking=booking)  # payments reembolsa si corresponde
    notifications.notify_on_commit(notifications.booking_cancelled, booking.pk)
    return booking


def cancel_booking(*, booking, actor, reason=""):
    with transaction.atomic():
        locked = _lock(booking.pk)
        if not (locked.guest_id == actor.id or is_host_or_staff(actor, locked)):
            raise PermissionDenied("No puede cancelar esta reserva.")
        return _close(locked, S.CANCELLED, reason)


def reject_booking(*, booking, actor, reason):
    with transaction.atomic():
        locked = _lock(booking.pk)
        if not is_host_or_staff(actor, locked):
            raise PermissionDenied("Solo el anfitrión puede rechazar la reserva.")
        return _close(locked, S.REJECTED, reason or "Rechazada por el anfitrión")


def complete_booking(*, booking, actor):
    with transaction.atomic():
        locked = _lock(booking.pk)
        if not is_host_or_staff(actor, locked):
            raise PermissionDenied("Solo el anfitrión puede finalizar la reserva.")
        if locked.status == S.CONFIRMED and locked.check_out > timezone.localdate():
            raise ValidationError({"detail": ["Solo se puede finalizar después de la fecha de salida."]})
        _transition(locked, S.COMPLETED)
        locked.save(update_fields=["status", "updated_at"])
        return locked


def update_notes(*, booking, actor, host_notes):
    if not is_host_or_staff(actor, booking):
        raise PermissionDenied("Solo el anfitrión puede anotar la reserva.")
    booking.host_notes = host_notes
    booking.save(update_fields=["host_notes", "updated_at"])
    return booking


def expire_pending_bookings(now=None):
    """Cancela reservas pendientes vencidas y sin pago informado. Pensado para cron. Devuelve cuántas expiró."""
    now = now or timezone.now()
    ids = list(
        Booking.objects.filter(status=S.PENDING, expires_at__lte=now)
        .exclude(payment__status="reported")
        .values_list("pk", flat=True)
    )
    count = 0
    for pk in ids:
        with transaction.atomic():
            locked = _lock(pk)
            if locked.status != S.PENDING:
                continue
            _close(locked, S.CANCELLED, "expired")
            count += 1
    return count
