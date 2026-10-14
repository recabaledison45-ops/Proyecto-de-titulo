from rest_framework import serializers

from .models import Payment


class PaymentCreateSerializer(serializers.Serializer):
    booking = serializers.IntegerField()


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "booking", "status", "method", "amount", "platform_fee", "host_payout",
                  "gateway_reference", "reported_at", "confirmed_at", "refunded_at"]
