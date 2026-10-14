from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.bookings.models import Booking
from shared.exceptions import Conflict

from .models import Review


def create_review(*, author, booking_id, rating, comment=""):
    """Reseña ciega cruzada: se publican ambas solo cuando huésped y anfitrión reseñaron la reserva."""
    with transaction.atomic():
        try:
            booking = Booking.objects.select_for_update().get(pk=booking_id)
        except Booking.DoesNotExist as exc:
            raise NotFound("Reserva no encontrada.") from exc
        if author.id == booking.guest_id:
            role = Review.AuthorRole.GUEST
        elif booking.listing.host_id == author.id:
            role = Review.AuthorRole.HOST
        else:
            raise PermissionDenied("Solo el huésped o el anfitrión de la reserva pueden reseñarla.")
        if booking.status not in (Booking.Status.CONFIRMED, Booking.Status.COMPLETED):
            raise Conflict("Solo se pueden reseñar reservas confirmadas.")
        if settings.REVIEW_REQUIRE_CHECKOUT_PASSED and booking.check_out > timezone.localdate():
            raise Conflict("Podrá reseñar después de la fecha de salida.")
        if Review.objects.filter(booking=booking, author=author).exists():
            raise Conflict("Ya reseñaste esta reserva.")

        review = Review.objects.create(booking=booking, author=author, author_role=role, rating=rating, comment=comment)
        if Review.objects.filter(booking=booking).count() >= 2:
            Review.objects.filter(booking=booking).update(is_published=True)
            review.refresh_from_db()
    return review
