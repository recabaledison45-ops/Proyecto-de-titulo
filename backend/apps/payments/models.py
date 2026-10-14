from django.db import models

from shared.models import TimeStampedModel


class Payment(TimeStampedModel):
    class Status(models.TextChoices):
        REPORTED = "reported", "Informado (pendiente de confirmación)"
        SUCCEEDED = "succeeded", "Confirmado"
        FAILED = "failed", "Fallido"
        REFUNDED = "refunded", "Reembolsado"

    class Method(models.TextChoices):
        SIMULATED = "simulated", "Pasarela simulada"
        BANK_TRANSFER = "bank_transfer", "Transferencia"

    booking = models.OneToOneField("bookings.Booking", on_delete=models.PROTECT, related_name="payment")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2)
    host_payout = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REPORTED)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.BANK_TRANSFER)
    gateway_reference = models.CharField(max_length=100, blank=True)
    reported_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Pago #{self.pk} · reserva {self.booking_id} · {self.status}"
