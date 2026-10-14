from django.contrib.auth.password_validation import validate_password
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from . import selectors
from .models import User


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.GUEST)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ese nombre de usuario ya existe.")
        return value

    def validate_email(self, value):
        if selectors.email_in_use(value):
            raise serializers.ValidationError("Ese correo ya está registrado.")
        return value

    def validate(self, attrs):
        validate_password(attrs["password"], user=User(username=attrs["username"], email=attrs["email"]))
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "is_staff", "display_name", "bio", "phone", "bank_details"]
        read_only_fields = ["id", "username", "role", "is_staff"]

    def validate_email(self, value):
        if selectors.email_in_use(value, exclude_id=self.instance.pk if self.instance else None):
            raise serializers.ValidationError("Ese correo ya está registrado.")
        return value


class PublicUserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "display_name"]

    @extend_schema_field(OpenApiTypes.STR)
    def get_display_name(self, obj):
        return obj.public_name


class HostProfileSerializer(PublicUserSerializer):
    class Meta(PublicUserSerializer.Meta):
        fields = ["id", "display_name", "bio"]
