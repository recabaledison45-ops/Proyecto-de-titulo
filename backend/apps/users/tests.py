from django.core.cache import cache
from rest_framework.test import APITestCase

from apps.users.models import User
from shared.testing import make_user

REGISTER = "/api/v1/auth/register/"


class AuthTests(APITestCase):
    def setUp(self):
        cache.clear()

    def payload(self, **extra):
        data = {"username": "nuevo", "email": "nuevo@example.com", "password": "Passw0rd!xyz", "role": "host"}
        data.update(extra)
        return data

    def test_register_returns_tokens_and_role(self):
        r = self.client.post(REGISTER, self.payload(), format="json")
        self.assertEqual(r.status_code, 201)
        self.assertIn("access", r.data)
        self.assertIn("refresh", r.data)
        self.assertEqual(r.data["user"]["role"], "host")
        self.assertNotIn("password", r.data["user"])

    def test_cannot_register_as_staff_or_unknown_role(self):
        r = self.client.post(REGISTER, self.payload(role="admin"), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(username="nuevo", is_staff=True).exists())

    def test_weak_password_and_duplicate_email_rejected(self):
        self.assertEqual(self.client.post(REGISTER, self.payload(password="123"), format="json").status_code, 400)
        make_user("existente", email="nuevo@example.com")
        r = self.client.post(REGISTER, self.payload(), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("email", r.data)

    def test_login_and_refresh_rotation(self):
        make_user("ana")
        r = self.client.post("/api/v1/auth/login/", {"username": "ana", "password": "Passw0rd!xyz"}, format="json")
        self.assertEqual(r.status_code, 200)
        r2 = self.client.post("/api/v1/auth/refresh/", {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(r2.status_code, 200)
        self.assertIn("access", r2.data)
        self.assertNotEqual(r2.data["refresh"], r.data["refresh"])  # rotación
        reuse = self.client.post("/api/v1/auth/refresh/", {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(reuse.status_code, 401)  # el refresh anterior quedó en lista negra

    def test_login_is_throttled_after_five_attempts(self):
        make_user("ana")
        codes = [
            self.client.post("/api/v1/auth/login/", {"username": "ana", "password": "mala"}, format="json").status_code
            for _ in range(6)
        ]
        self.assertEqual(codes[:5], [401] * 5)
        self.assertEqual(codes[5], 429)

    def test_me_requires_auth_and_ignores_role_changes(self):
        self.assertEqual(self.client.get("/api/v1/users/me/").status_code, 401)
        user = make_user("ana")
        self.client.force_authenticate(user)
        r = self.client.patch("/api/v1/users/me/", {"display_name": "Ana", "role": "host", "is_staff": True}, format="json")
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        self.assertEqual((user.display_name, user.role, user.is_staff), ("Ana", "guest", False))

    def test_health_is_public(self):
        self.assertEqual(self.client.get("/api/v1/health/").data, {"status": "ok"})


class SeedDemoTests(APITestCase):
    def test_seed_is_idempotent_and_covers_the_four_categories(self):
        from django.core.management import call_command

        from apps.bookings.models import Booking
        from apps.listings.models import Listing

        call_command("seed_demo", verbosity=0)
        call_command("seed_demo", verbosity=0)
        self.assertEqual(set(Listing.objects.values_list("category", flat=True)), {"lodging", "package", "guide", "activity"})
        self.assertEqual(Listing.objects.count(), 9)
        self.assertEqual(Booking.objects.count(), 2)
        self.assertTrue(User.objects.get(username="anfitrion").check_password("demo1234"))
        self.assertTrue(Listing.objects.filter(booking_mode="shared").exists())

    def test_demo_admin_with_known_password_never_exists_in_production(self):
        from django.core.management import call_command
        from django.test import override_settings

        User.objects.create_superuser("admin", "admin@example.com", "demo1234")  # como lo dejaba la versión anterior
        with override_settings(DEBUG=False):
            call_command("seed_demo", verbosity=0)
        admin = User.objects.get(username="admin")
        self.assertFalse(admin.check_password("demo1234"))
        self.assertFalse(admin.has_usable_password())

    def test_seed_uses_site_photos_and_replaces_old_random_ones(self):
        from django.core.management import call_command
        from django.test import override_settings

        from apps.listings.models import Listing

        with override_settings(FRONTEND_URL="https://sitio.example"):
            call_command("seed_demo", verbosity=0)
            cabin = Listing.objects.get(title__startswith="Cabaña")
            self.assertEqual(cabin.photo_url, "https://sitio.example/photos/cabana-mar.jpg")
            Listing.objects.filter(pk=cabin.pk).update(photo_url="https://picsum.photos/seed/cabana-mar/900/600")
            Listing.objects.filter(title__startswith="Casona").update(photo_url="https://fotos.example/mi-foto.jpg")
            call_command("seed_demo", verbosity=0)
        self.assertEqual(Listing.objects.get(pk=cabin.pk).photo_url, "https://sitio.example/photos/cabana-mar.jpg")
        self.assertEqual(Listing.objects.get(title__startswith="Casona").photo_url, "https://fotos.example/mi-foto.jpg")
