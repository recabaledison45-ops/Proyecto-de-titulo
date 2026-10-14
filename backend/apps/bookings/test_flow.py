from decimal import Decimal

from django.test import override_settings

from apps.payments.models import Payment
from apps.reviews.models import Review
from shared.testing import BaseAPITest, day

API = "/api/v1"


@override_settings(PAYMENT_GATEWAY="simulated")
class FullFlowTest(BaseAPITest):
    """Regla 6: crear → buscar por bbox y categoría → reservar → pagar → reseñar (ciego) → cancelar pagada (reembolso)."""

    def test_6_full_flow_through_the_api(self):
        # 1. el anfitrión crea una oferta de categoría «guide»
        self.login(self.host)
        created = self.client.post(f"{API}/listings/", {
            "category": "guide", "title": "Guía del Maule", "description": "Recorrido", "city": "Talca",
            "latitude": -35.43, "longitude": -71.66, "price_per_night": "40000", "max_guests": 3}, format="json")
        self.assertEqual(created.status_code, 201)
        listing_id = created.data["id"]

        # 2. el huésped la encuentra por bbox + categoría
        self.login(self.guest)
        found = self.client.get(f"{API}/listings/", {"lat_min": -36, "lat_max": -35, "lng_min": -72, "lng_max": -71,
                                                     "category": "guide"})
        self.assertEqual([x["id"] for x in found.data["results"]], [listing_id])
        self.assertEqual(self.client.get(f"{API}/listings/", {"lat_min": -10, "lat_max": -9, "lng_min": -72, "lng_max": -71,
                                                              "category": "guide"}).data["count"], 0)

        # 3. reserva (2 días × 40.000)
        booking = self.client.post(f"{API}/bookings/", {"listing": listing_id, "check_in": str(day(10)),
                                                         "check_out": str(day(12)), "guests": 2}, format="json")
        self.assertEqual(booking.status_code, 201)
        self.assertEqual(Decimal(booking.data["total_price"]), Decimal("80000.00"))
        bid = booking.data["id"]

        # 4. paga: comisión 10 % y neto 90 %; la reserva queda confirmada
        paid = self.client.post(f"{API}/payments/", {"booking": bid}, format="json")
        self.assertEqual(paid.status_code, 201)
        self.assertEqual(Decimal(paid.data["amount"]), Decimal("80000.00"))
        self.assertEqual(Decimal(paid.data["platform_fee"]), Decimal("8000.00"))
        self.assertEqual(Decimal(paid.data["host_payout"]), Decimal("72000.00"))
        mine = self.client.get(f"{API}/bookings/?as=guest").data["results"][0]
        self.assertEqual(mine["status"], "confirmed")
        self.assertEqual(mine["payment"]["status"], "succeeded")

        # 5. reseñas ciegas: no se publican hasta que ambos reseñan
        r1 = self.client.post(f"{API}/reviews/", {"booking": bid, "rating": 5, "comment": "Genial"}, format="json")
        self.assertEqual((r1.status_code, r1.data["is_published"]), (201, False))
        self.assertEqual(self.client.get(f"{API}/reviews/?listing={listing_id}").data, [])
        self.login(self.host)
        r2 = self.client.post(f"{API}/reviews/", {"booking": bid, "rating": 4, "comment": "Buen huésped"}, format="json")
        self.assertEqual((r2.status_code, r2.data["is_published"]), (201, True))
        self.assertEqual(Review.objects.filter(is_published=True).count(), 2)
        self.assertEqual(len(self.client.get(f"{API}/reviews/?listing={listing_id}").data), 1)

        # 6. cancela la reserva pagada → reembolso automático y fechas libres
        self.login(self.guest)
        cancelled = self.client.post(f"{API}/bookings/{bid}/cancel/")
        self.assertEqual((cancelled.status_code, cancelled.data["status"]), (200, "cancelled"))
        payment = Payment.objects.get(booking_id=bid)
        self.assertEqual(payment.status, "refunded")
        self.assertIsNotNone(payment.refunded_at)
        self.login(self.other)
        again = self.client.post(f"{API}/bookings/", {"listing": listing_id, "check_in": str(day(10)),
                                                       "check_out": str(day(12)), "guests": 1}, format="json")
        self.assertEqual(again.status_code, 201)
