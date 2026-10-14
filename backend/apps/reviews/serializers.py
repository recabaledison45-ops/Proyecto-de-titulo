from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Review


class ReviewCreateSerializer(serializers.Serializer):
    booking = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "booking", "rating", "comment", "author_role", "author_name", "is_published", "created_at"]

    @extend_schema_field(OpenApiTypes.STR)
    def get_author_name(self, obj):
        return obj.author.public_name
