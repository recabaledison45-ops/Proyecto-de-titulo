from django.conf import settings
from django.db import models
from django.db.models import F, Q

from shared.models import TimeStampedModel


class Booking(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        CONFIRMED = "confirmed", "Confirmada"
        REJECTED = "rejected", "Rechazada"
        CANCELLED = "cancelled", "Cancelada"
        COMPLETED = "completed", "Finalizada"

    listing = models.ForeignKey("listings.Listing", on_delete=models.PROTECT, related_name="bookings")
    guest = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bookings")
    check_in = models.DateField()
    check_out = models.DateField()  # la fecha de salida no cuenta como noche ocupada
    guests = models.PositiveSmallIntegerField()
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField(null=True, blank=True)
    host_notes = models.TextField(blank=True)
    cancel_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["listing", "status", "check_in", "check_out"], name="booking_avail_idx")]
        constraints = [
            models.CheckConstraint(condition=Q(check_out__gt=F("check_in")), name="booking_checkout_after_checkin"),
        ]

    def __str__(self):
        return f"Reserva #{self.pk} · {self.listing_id} · {self.check_in}→{self.check_out}"
