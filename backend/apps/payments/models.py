from django.db import models

from shared.models import TimeStampedModel


class Payment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Iniciado (esperando a Webpay)"
        REPORTED = "reported", "Informado (pendiente de confirmación)"
        SUCCEEDED = "succeeded", "Confirmado"
        FAILED = "failed", "Fallido"
        REFUNDED = "refunded", "Reembolsado"
        REFUND_PENDING = "refund_pending", "Reembolso pendiente (manual)"

    class Method(models.TextChoices):
        SIMULATED = "simulated", "Pasarela simulada"
        BANK_TRANSFER = "bank_transfer", "Transferencia"
        WEBPAY = "webpay", "Tarjeta (Webpay Plus)"

    booking = models.OneToOneField("bookings.Booking", on_delete=models.PROTECT, related_name="payment")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2)
    host_payout = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REPORTED)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.BANK_TRANSFER)
    gateway_reference = models.CharField(max_length=100, blank=True)
    # Webpay: token de la transacción en curso, orden de compra y respuesta de la confirmación (comprobante/auditoría).
    gateway_token = models.CharField(max_length=64, blank=True, db_index=True)
    buy_order = models.CharField(max_length=26, blank=True, db_index=True)
    gateway_payload = models.JSONField(default=dict, blank=True)
    reported_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    @property
    def receipt(self):
        """Datos del comprobante de un pago con tarjeta (los que Transbank exige mostrar al cliente)."""
        d = self.gateway_payload or {}
        if self.method != self.Method.WEBPAY or not d.get("authorization_code"):
            return None
        return {
            "buy_order": self.buy_order,
            "authorization_code": d.get("authorization_code"),
            "card_last4": (d.get("card_detail") or {}).get("card_number", ""),
            "payment_type_code": d.get("payment_type_code", ""),
            "installments_number": d.get("installments_number") or 0,
            "transaction_date": d.get("transaction_date"),
        }

    def __str__(self):
        return f"Pago #{self.pk} · reserva {self.booking_id} · {self.status}"
