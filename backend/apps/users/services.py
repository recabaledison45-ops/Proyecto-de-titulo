from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


def register_user(*, username, email, password, role):
    user = User.objects.create_user(username=username, email=email, password=password, role=role)
    refresh = RefreshToken.for_user(user)
    return user, {"access": str(refresh.access_token), "refresh": str(refresh)}


def update_profile(*, user, data):
    for field, value in data.items():
        setattr(user, field, value)
    user.save()
    return user
