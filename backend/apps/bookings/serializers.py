from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer


class BookingCreateSerializer(serializers.Serializer):
    listing = serializers.IntegerField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    guests = serializers.IntegerField(min_value=1)


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255, default="")


class NotesSerializer(serializers.Serializer):
    host_notes = serializers.CharField(allow_blank=True, max_length=5000)


class BookingSerializer(serializers.Serializer):
    """Serializador de lectura. Usa duck typing para `payment` y `reviews`: bookings no importa payments ni reviews."""

    id = serializers.IntegerField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    guests = serializers.IntegerField()
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()
    expires_at = serializers.DateTimeField()
    cancel_reason = serializers.CharField()
    created_at = serializers.DateTimeField()
    listing = serializers.SerializerMethodField()
    guest = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    reviewed_by_me = serializers.SerializerMethodField()

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_listing(self, obj):
        l = obj.listing
        request = self.context.get("request")
        image = (request.build_absolute_uri(l.image.url) if (l.image and request) else l.photo_url) or ""
        return {"id": l.id, "title": l.title, "category": l.category, "city": l.city, "image_url": image,
                "booking_mode": l.booking_mode}

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_guest(self, obj):
        data = PublicUserSerializer(obj.guest).data
        return {"id": data["id"], "username": obj.guest.username, "display_name": data["display_name"]}

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_payment(self, obj):
        p = getattr(obj, "payment", None)
        if p is None:
            return None
        return {"id": p.id, "status": p.status, "method": p.method, "amount": str(p.amount),
                "platform_fee": str(p.platform_fee), "host_payout": str(p.host_payout),
                "reported_at": p.reported_at, "confirmed_at": p.confirmed_at, "refunded_at": p.refunded_at}

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_reviewed_by_me(self, obj):
        user = self.context["request"].user
        return any(r.author_id == user.id for r in obj.reviews.all())

    def to_representation(self, instance):
        data = super().to_representation(instance)
        user = self.context["request"].user
        if user.is_staff or instance.listing.host_id == user.id:
            data["host_notes"] = instance.host_notes  # las notas internas no las ve el huésped
        return data
