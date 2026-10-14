from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from shared.models import TimeStampedModel


class Review(TimeStampedModel):
    class AuthorRole(models.TextChoices):
        GUEST = "guest", "Huésped"
        HOST = "host", "Anfitrión"

    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="reviews")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_written")
    author_role = models.CharField(max_length=10, choices=AuthorRole.choices)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    is_published = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["booking", "author"], name="one_review_per_author_booking")]

    def __str__(self):
        return f"Reseña {self.rating}★ de {self.author_id} sobre reserva {self.booking_id}"
