from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.users.serializers import HostProfileSerializer, PublicUserSerializer

from .models import BookingMode, Category, Difficulty, Listing

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_BYTES = 2 * 1024 * 1024


class SearchParamsSerializer(serializers.Serializer):
    lat_min = serializers.FloatField(required=False)
    lat_max = serializers.FloatField(required=False)
    lng_min = serializers.FloatField(required=False)
    lng_max = serializers.FloatField(required=False)
    category = serializers.ChoiceField(choices=Category.choices, required=False)
    difficulty = serializers.ChoiceField(choices=Difficulty.choices, required=False)
    max_duration_hours = serializers.DecimalField(max_digits=5, decimal_places=1, required=False)
    check_in = serializers.DateField(required=False)
    check_out = serializers.DateField(required=False)
    guests = serializers.IntegerField(required=False, min_value=1)
    mine = serializers.BooleanField(required=False)
    ordering = serializers.CharField(required=False)

    def validate(self, attrs):
        ci, co = attrs.get("check_in"), attrs.get("check_out")
        if bool(ci) != bool(co):
            raise serializers.ValidationError({"check_in": ["Indique llegada y salida juntas."]})
        if ci and co and co <= ci:
            raise serializers.ValidationError({"check_out": ["La salida debe ser posterior a la llegada."]})
        return attrs


class _ImageUrlMixin:
    @extend_schema_field(OpenApiTypes.STR)
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return obj.photo_url or ""


class ListingListSerializer(_ImageUrlMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    host = PublicUserSerializer(read_only=True)

    class Meta:
        model = Listing
        fields = ["id", "title", "category", "city", "latitude", "longitude", "price_per_night", "max_guests",
                  "booking_mode", "difficulty", "duration_hours", "image_url", "rating_avg", "reviews_count",
                  "is_active", "host"]

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_rating_avg(self, obj):
        value = getattr(obj, "rating_avg", None)
        return round(float(value), 1) if value is not None else None

    @extend_schema_field(OpenApiTypes.INT)
    def get_reviews_count(self, obj):
        return getattr(obj, "reviews_count", 0) or 0


class ListingDetailSerializer(ListingListSerializer):
    host = HostProfileSerializer(read_only=True)

    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + ["description", "address", "dress_code", "wellness_benefits"]


class ListingWriteSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    booking_mode = serializers.ChoiceField(choices=BookingMode.choices, required=False)
    difficulty = serializers.ChoiceField(choices=Difficulty.choices, required=False, allow_blank=True)

    class Meta:
        model = Listing
        fields = ["category", "title", "description", "city", "address", "latitude", "longitude",
                  "price_per_night", "max_guests", "booking_mode", "duration_hours", "difficulty",
                  "dress_code", "wellness_benefits", "image", "photo_url"]

    def validate_image(self, value):
        if value is None:
            return value
        if value.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError("La imagen no puede superar los 2 MB.")
        fmt = getattr(getattr(value, "image", None), "format", None)
        if fmt not in ALLOWED_FORMATS:
            raise serializers.ValidationError("Formato no permitido: use JPEG, PNG o WEBP.")
        return value

    def to_representation(self, instance):
        return ListingDetailSerializer(instance, context=self.context).data
