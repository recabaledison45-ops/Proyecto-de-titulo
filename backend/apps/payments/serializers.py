from rest_framework import serializers

from .models import Payment


class PaymentCreateSerializer(serializers.Serializer):
    booking = serializers.IntegerField()


class WebpayStartSerializer(serializers.Serializer):
    payment = serializers.IntegerField(help_text="Id del pago iniciado")
    url = serializers.URLField(help_text="Formulario de pago de Webpay: enviar aquí al navegador por POST")
    token = serializers.CharField(help_text="Valor del campo token_ws")


class PaymentSerializer(serializers.ModelSerializer):
    receipt = serializers.JSONField(read_only=True, allow_null=True)

    class Meta:
        model = Payment
        fields = ["id", "booking", "status", "method", "amount", "platform_fee", "host_payout",
                  "gateway_reference", "reported_at", "confirmed_at", "refunded_at", "receipt"]
