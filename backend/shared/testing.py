"""Utilidades compartidas por las pruebas."""
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.listings.models import Listing
from apps.users.models import User


def day(offset=0):
    """Fecha de hoy + offset días."""
    return timezone.localdate() + timedelta(days=offset)


def make_user(username, role="guest", **extra):
    extra.setdefault("email", f"{username}@example.com")
    return User.objects.create_user(username=username, password="Passw0rd!xyz", role=role, **extra)


def make_listing(host, **kwargs):
    data = dict(
        category="lodging",
        title="Cabaña frente al mar",
        description="Descripción",
        city="Constitución",
        address="Av. Costanera 1",
        latitude=-35.33,
        longitude=-72.41,
        price_per_night=Decimal("50000"),
        max_guests=4,
    )
    data.update(kwargs)
    return Listing.objects.create(host=host, **data)


class BaseAPITest(APITestCase):
    def setUp(self):
        cache.clear()  # reinicia los contadores de throttling
        self.host = make_user("anfitrion", "host")
        self.guest = make_user("huesped", "guest")
        self.other = make_user("otro", "guest")
        self.listing = make_listing(self.host)

    def login(self, user):
        self.client.force_authenticate(user)

    def logout(self):
        self.client.force_authenticate(None)

    def book(self, user=None, listing=None, ci=5, co=8, guests=2):
        if user:
            self.login(user)
        return self.client.post(
            "/api/v1/bookings/",
            {"listing": (listing or self.listing).pk, "check_in": str(day(ci)), "check_out": str(day(co)), "guests": guests},
            format="json",
        )
