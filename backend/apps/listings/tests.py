import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from apps.bookings.models import Booking
from apps.reviews.models import Review
from shared.testing import BaseAPITest, day, make_listing

LIST = "/api/v1/listings/"


def image_file(fmt="PNG", name="foto.png", size=(20, 20)):
    buf = io.BytesIO()
    Image.new("RGB", size, "green").save(buf, fmt)
    return SimpleUploadedFile(name, buf.getvalue(), content_type=f"image/{fmt.lower()}")


class ListingCrudTests(BaseAPITest):
    payload = {"category": "activity", "title": "Tour", "description": "x", "city": "Talca", "latitude": -35.4,
               "longitude": -71.6, "price_per_night": "20000", "max_guests": 6, "difficulty": "easy",
               "duration_hours": "3.5", "dress_code": "Cómoda"}

    def test_host_creates_listing_with_technical_sheet(self):
        self.login(self.host)
        r = self.client.post(LIST, self.payload, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["category"], "activity")
        self.assertEqual(r.data["difficulty"], "easy")
        self.assertEqual(r.data["host"]["id"], self.host.id)

    def test_guest_and_anonymous_cannot_create(self):
        self.assertEqual(self.client.post(LIST, self.payload, format="json").status_code, 401)
        self.login(self.guest)
        self.assertEqual(self.client.post(LIST, self.payload, format="json").status_code, 403)

    def test_invalid_data_rejected(self):
        self.login(self.host)
        bad = dict(self.payload, price_per_night="0", max_guests=0, latitude=120)
        r = self.client.post(LIST, bad, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertTrue({"price_per_night", "max_guests", "latitude"} <= set(r.data))

    def test_only_owner_can_edit(self):
        url = f"{LIST}{self.listing.pk}/"
        self.login(self.other)
        self.assertEqual(self.client.patch(url, {"title": "Hack"}, format="json").status_code, 403)
        self.login(self.host)
        r = self.client.patch(url, {"title": "Nuevo título"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["title"], "Nuevo título")

    def test_soft_delete_and_hidden_from_public(self):
        url = f"{LIST}{self.listing.pk}/"
        self.login(self.host)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.listing.refresh_from_db()
        self.assertFalse(self.listing.is_active)
        self.logout()
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.get(LIST).data["count"], 0)

    def test_delete_with_open_bookings_returns_409(self):
        self.assertEqual(self.book(self.guest).status_code, 201)
        self.login(self.host)
        r = self.client.delete(f"{LIST}{self.listing.pk}/")
        self.assertEqual(r.status_code, 409)
        self.listing.refresh_from_db()
        self.assertTrue(self.listing.is_active)

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_image_upload_validation(self):
        from django.conf import settings

        self.addCleanup(shutil.rmtree, settings.MEDIA_ROOT, True)
        self.login(self.host)
        ok = self.client.post(LIST, {**self.payload, "image": image_file()}, format="multipart")
        self.assertEqual(ok.status_code, 201, ok.data)
        self.assertTrue(ok.data["image_url"].startswith("http"))
        bad_type = SimpleUploadedFile("x.png", b"no soy una imagen", content_type="image/png")
        self.assertEqual(self.client.post(LIST, {**self.payload, "image": bad_type}, format="multipart").status_code, 400)
        gif = image_file("GIF", "a.gif")
        self.assertEqual(self.client.post(LIST, {**self.payload, "image": gif}, format="multipart").status_code, 400)
        big = SimpleUploadedFile("big.png", b"0" * (2 * 1024 * 1024 + 1), content_type="image/png")
        self.assertEqual(self.client.post(LIST, {**self.payload, "image": big}, format="multipart").status_code, 400)


class ListingSearchTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.guide = make_listing(self.host, category="guide", title="Guía", latitude=-35.40, longitude=-71.60,
                                  difficulty="hard", duration_hours="6", max_guests=2)
        self.far = make_listing(self.host, title="Lejos", latitude=-33.4, longitude=-70.6)

    def ids(self, **params):
        return {x["id"] for x in self.client.get(LIST, params).data["results"]}

    def test_bounding_box_and_category(self):
        box = dict(lat_min=-36, lat_max=-35, lng_min=-73, lng_max=-71)
        self.assertEqual(self.ids(**box), {self.listing.id, self.guide.id})
        self.assertEqual(self.ids(**box, category="guide"), {self.guide.id})
        self.assertNotIn(self.far.id, self.ids(**box))

    def test_guests_capacity_filter(self):
        self.assertNotIn(self.guide.id, self.ids(guests=3))
        self.assertIn(self.listing.id, self.ids(guests=3))

    def test_dates_exclude_booked_listings(self):
        self.assertEqual(self.book(self.guest, ci=5, co=8).status_code, 201)
        free = self.ids(check_in=str(day(5)), check_out=str(day(8)))
        self.assertNotIn(self.listing.id, free)
        self.assertIn(self.guide.id, free)
        # salida = llegada de otra reserva: sigue disponible
        self.assertIn(self.listing.id, self.ids(check_in=str(day(8)), check_out=str(day(10))))

    def test_invalid_dates_return_400(self):
        r = self.client.get(LIST, {"check_in": str(day(8)), "check_out": str(day(5))})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.client.get(LIST, {"check_in": str(day(8))}).status_code, 400)

    def test_technical_sheet_filters(self):
        self.assertEqual(self.ids(difficulty="hard"), {self.guide.id})
        self.assertEqual(self.ids(max_duration_hours=3), set())
        self.assertIn(self.guide.id, self.ids(max_duration_hours=6))

    def test_free_text_search(self):
        self.assertIn(self.listing.id, self.ids(q="constitución"))
        self.assertIn(self.listing.id, self.ids(q="Cabaña"))
        self.assertEqual(self.ids(q="no-existe-xyz"), set())

    def test_order_by_rating_puts_unrated_last(self):
        r = self.client.get(LIST, {"ordering": "-rating"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 3)

    def test_pagination_and_ordering(self):
        r = self.client.get(LIST, {"page_size": 2, "ordering": "price_per_night"})
        self.assertEqual(r.data["count"], 3)
        self.assertEqual(len(r.data["results"]), 2)
        self.assertIsNotNone(r.data["next"])

    def test_mine_requires_auth_and_includes_inactive(self):
        self.assertEqual(self.client.get(LIST, {"mine": "true"}).status_code, 401)
        self.far.is_active = False
        self.far.save()
        self.login(self.host)
        mine = {x["id"] for x in self.client.get(LIST, {"mine": "true"}).data["results"]}
        self.assertIn(self.far.id, mine)
        self.login(self.guest)
        self.assertEqual(self.client.get(LIST, {"mine": "true"}).data["count"], 0)

    def test_rating_only_counts_published_guest_reviews(self):
        b = Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(-9), check_out=day(-7),
                                   guests=1, total_price=1, status="completed")
        Review.objects.create(booking=b, author=self.guest, author_role="guest", rating=4, is_published=True)
        Review.objects.create(booking=b, author=self.host, author_role="host", rating=1, is_published=True)
        r = self.client.get(f"{LIST}{self.listing.pk}/")
        self.assertEqual((r.data["rating_avg"], r.data["reviews_count"]), (4.0, 1))

    def test_booked_dates_exclusive_and_shared(self):
        self.book(self.guest, ci=3, co=5, guests=2)
        r = self.client.get(f"{LIST}{self.listing.pk}/booked-dates/")
        self.assertEqual(r.data["mode"], "exclusive")
        self.assertEqual([o["date"] for o in r.data["occupied"]], [str(day(3)), str(day(4))])  # la salida no cuenta
        tour = make_listing(self.host, title="Tour grupal", booking_mode="shared", max_guests=5)
        self.book(self.guest, listing=tour, ci=3, co=4, guests=3)
        self.book(self.other, listing=tour, ci=3, co=4, guests=2)
        r = self.client.get(f"{LIST}{tour.pk}/booked-dates/")
        self.assertEqual(r.data["capacity"], 5)
        self.assertEqual(r.data["occupied"], [{"date": str(day(3)), "taken": 5}])
