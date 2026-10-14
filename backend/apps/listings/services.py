from rest_framework.exceptions import ValidationError

from apps.bookings import selectors as booking_selectors
from shared.exceptions import Conflict

from .models import Listing


def create_listing(*, host, data):
    return Listing.objects.create(host=host, **data)


def update_listing(*, listing, data):
    for field, value in data.items():
        setattr(listing, field, value)
    listing.save()
    return listing


def deactivate_listing(*, listing):
    """Baja lógica; se rechaza si hay reservas vigentes."""
    if booking_selectors.has_open_bookings(listing):
        raise Conflict("No se puede dar de baja: la oferta tiene reservas pendientes o confirmadas vigentes.")
    listing.is_active = False
    listing.save(update_fields=["is_active", "updated_at"])
    return listing


def validate_dates_range(check_in, check_out):
    if check_in and check_out and check_out <= check_in:
        raise ValidationError({"check_out": ["La salida debe ser posterior a la llegada."]})
