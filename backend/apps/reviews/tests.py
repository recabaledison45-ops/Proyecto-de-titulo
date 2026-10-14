from django.test import override_settings

from apps.bookings.models import Booking
from apps.reviews.models import Review
from shared.testing import BaseAPITest, day

REVIEWS = "/api/v1/reviews/"


class ReviewTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.confirmed = Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(-6), check_out=day(-4),
                                                guests=2, total_price=100, status="confirmed")

    def review(self, user, booking=None, rating=5, comment="Excelente"):
        self.login(user)
        return self.client.post(REVIEWS, {"booking": (booking or self.confirmed).pk, "rating": rating, "comment": comment},
                                format="json")

    def test_blind_publication_only_when_both_parties_reviewed(self):
        r1 = self.review(self.guest)
        self.assertEqual((r1.status_code, r1.data["is_published"]), (201, False))
        self.logout()
        self.assertEqual(self.client.get(f"{REVIEWS}?listing={self.listing.pk}").data, [])  # nadie la ve
        r2 = self.review(self.host, rating=4)
        self.assertEqual((r2.status_code, r2.data["is_published"]), (201, True))
        self.assertEqual(Review.objects.filter(is_published=True).count(), 2)  # ambas, a la vez
        self.logout()
        listed = self.client.get(f"{REVIEWS}?listing={self.listing.pk}").data
        self.assertEqual([x["author_role"] for x in listed], ["guest"])  # la ficha muestra la reseña del huésped

    def test_only_confirmed_or_completed_bookings(self):
        pending = Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(3), check_out=day(4),
                                         guests=1, total_price=1, status="pending")
        self.assertEqual(self.review(self.guest, pending).status_code, 409)
        cancelled = Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(6), check_out=day(7),
                                           guests=1, total_price=1, status="cancelled")
        self.assertEqual(self.review(self.guest, cancelled).status_code, 409)

    def test_one_review_per_author_and_booking(self):
        self.assertEqual(self.review(self.guest).status_code, 201)
        self.assertEqual(self.review(self.guest).status_code, 409)

    def test_strangers_cannot_review_and_rating_is_validated(self):
        self.assertEqual(self.review(self.other).status_code, 403)
        self.assertEqual(self.review(self.guest, rating=6).status_code, 400)
        self.assertEqual(self.review(self.guest, rating=0).status_code, 400)
        self.logout()
        self.assertEqual(self.client.post(REVIEWS, {"booking": self.confirmed.pk, "rating": 5}, format="json").status_code, 401)

    @override_settings(REVIEW_REQUIRE_CHECKOUT_PASSED=True)
    def test_production_rule_requires_checkout_passed(self):
        future = Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(2), check_out=day(4),
                                        guests=1, total_price=1, status="confirmed")
        self.assertEqual(self.review(self.guest, future).status_code, 409)
        self.assertEqual(self.review(self.guest).status_code, 201)  # ya pasó el check-out

    def test_list_requires_listing_param(self):
        self.assertEqual(self.client.get(REVIEWS).status_code, 400)
