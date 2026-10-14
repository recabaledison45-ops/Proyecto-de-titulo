from datetime import timedelta
from decimal import Decimal

from django.core import mail
from django.core.management import call_command
from django.utils import timezone

from apps.bookings.models import Booking
from apps.payments.models import Payment
from shared.testing import BaseAPITest, day, make_listing


class BookingRulesTests(BaseAPITest):
    """Reglas de negocio 1 a 5 del encargo."""

    def test_1_overlapping_dates_fail_with_409(self):
        self.assertEqual(self.book(self.guest, ci=5, co=8).status_code, 201)
        r = self.book(self.other, ci=7, co=10)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(Booking.objects.count(), 1)

    def test_2_consecutive_bookings_without_overlap_are_allowed(self):
        self.assertEqual(self.book(self.guest, ci=5, co=8).status_code, 201)
        self.assertEqual(self.book(self.other, ci=8, co=10).status_code, 201)  # salida = llegada
        self.assertEqual(self.book(self.other, ci=3, co=5).status_code, 201)

    def test_3_cancel_frees_dates(self):
        b = self.book(self.guest, ci=5, co=8).data
        self.assertEqual(self.book(self.other, ci=5, co=8).status_code, 409)
        self.login(self.guest)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{b['id']}/cancel/").status_code, 200)
        self.assertEqual(self.book(self.other, ci=5, co=8).status_code, 201)

    def test_4_host_cannot_book_own_listing(self):
        self.assertEqual(self.book(self.host).status_code, 403)
        self.assertEqual(Booking.objects.count(), 0)

    def test_5_max_guests_is_enforced(self):
        r = self.book(self.guest, guests=5)  # capacidad 4
        self.assertEqual(r.status_code, 400)
        self.assertIn("guests", r.data)
        self.assertEqual(self.book(self.guest, guests=4).status_code, 201)


class BookingBehaviourTests(BaseAPITest):
    def test_total_is_nights_times_price(self):
        r = self.book(self.guest, ci=5, co=8)
        self.assertEqual(Decimal(r.data["total_price"]), Decimal("150000.00"))
        self.assertEqual(r.data["status"], "pending")
        self.assertIsNotNone(r.data["expires_at"])

    def test_invalid_dates_and_anonymous(self):
        self.assertEqual(self.book(self.guest, ci=8, co=5).status_code, 400)
        self.assertEqual(self.book(self.guest, ci=-2, co=1).status_code, 400)  # pasado
        self.logout()
        self.assertEqual(self.book().status_code, 401)

    def test_inactive_listing_cannot_be_booked(self):
        self.listing.is_active = False
        self.listing.save()
        self.assertEqual(self.book(self.guest).status_code, 400)

    def test_shared_mode_uses_capacity_per_date_and_prices_per_person(self):
        tour = make_listing(self.host, title="Tour", booking_mode="shared", max_guests=5, price_per_night=10000)
        r = self.book(self.guest, listing=tour, ci=4, co=6, guests=3)
        self.assertEqual(Decimal(r.data["total_price"]), Decimal("60000.00"))  # 2 días × 3 personas
        self.assertEqual(self.book(self.other, listing=tour, ci=4, co=5, guests=3).status_code, 409)
        self.assertEqual(self.book(self.other, listing=tour, ci=4, co=5, guests=2).status_code, 201)  # último cupo
        self.assertEqual(self.book(self.other, listing=tour, ci=4, co=5, guests=1).status_code, 409)
        self.assertEqual(self.book(self.other, listing=tour, ci=5, co=6, guests=2).status_code, 201)

    def test_state_machine_blocks_invalid_transitions(self):
        b = self.book(self.guest).data
        self.login(self.guest)
        url = f"/api/v1/bookings/{b['id']}/cancel/"
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(self.client.post(url).status_code, 409)  # cancelar una cancelada
        self.login(self.host)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{b['id']}/reject/", {"reason": "x"}).status_code, 409)

    def test_only_participants_can_cancel(self):
        b = self.book(self.guest).data
        self.login(self.other)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{b['id']}/cancel/").status_code, 403)
        self.login(self.host)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{b['id']}/cancel/", {"reason": "Mal clima"}).status_code, 200)

    def test_host_rejects_with_reason_and_frees_dates(self):
        b = self.book(self.guest).data
        self.login(self.guest)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{b['id']}/reject/").status_code, 403)  # no es anfitrión
        self.login(self.host)
        r = self.client.post(f"/api/v1/bookings/{b['id']}/reject/", {"reason": "Sin disponibilidad de guía"})
        self.assertEqual((r.status_code, r.data["status"], r.data["cancel_reason"]), (200, "rejected", "Sin disponibilidad de guía"))
        self.assertEqual(self.book(self.other).status_code, 201)

    def test_complete_requires_checkout_passed(self):
        b = Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(2), check_out=day(4),
                                   guests=1, total_price=1, status="confirmed")
        self.login(self.host)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{b.pk}/complete/").status_code, 400)
        Booking.objects.filter(pk=b.pk).update(check_in=day(-4), check_out=day(-2))
        r = self.client.post(f"/api/v1/bookings/{b.pk}/complete/")
        self.assertEqual((r.status_code, r.data["status"]), (200, "completed"))

    def test_host_notes_are_private_to_host(self):
        b = self.book(self.guest).data
        self.login(self.guest)
        self.assertEqual(self.client.patch(f"/api/v1/bookings/{b['id']}/notes/", {"host_notes": "x"}, format="json").status_code, 403)
        self.login(self.host)
        r = self.client.patch(f"/api/v1/bookings/{b['id']}/notes/", {"host_notes": "Llega en bus"}, format="json")
        self.assertEqual(r.data["host_notes"], "Llega en bus")
        self.login(self.guest)
        mine = self.client.get("/api/v1/bookings/").data["results"][0]
        self.assertNotIn("host_notes", mine)

    def test_list_as_guest_and_as_host(self):
        self.book(self.guest, ci=5, co=6)
        self.book(self.other, ci=8, co=9)
        self.login(self.guest)
        self.assertEqual(self.client.get("/api/v1/bookings/?as=guest").data["count"], 1)
        self.login(self.host)
        self.assertEqual(self.client.get("/api/v1/bookings/?as=host").data["count"], 2)
        self.assertEqual(self.client.get("/api/v1/bookings/?as=host&status=confirmed").data["count"], 0)
        self.assertEqual(self.client.get("/api/v1/bookings/?as=host&status=zzz").status_code, 400)
        self.login(self.other)
        self.assertEqual(self.client.get("/api/v1/bookings/?as=host").data["count"], 0)

    def test_expired_pending_bookings_are_cancelled_and_free_dates(self):
        b = self.book(self.guest, ci=5, co=8).data
        Booking.objects.filter(pk=b["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
        # vencida: ya no bloquea fechas, aun antes de que corra el cron
        self.assertEqual(self.book(self.other, ci=5, co=8).status_code, 201)
        out = Booking.objects.get(pk=b["id"])
        self.assertEqual(out.status, "pending")
        call_command("expire_pending_bookings")
        out.refresh_from_db()
        self.assertEqual((out.status, out.cancel_reason), ("cancelled", "expired"))

    def test_expiry_spares_reported_payments_and_confirmed(self):
        b = Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(5), check_out=day(6), guests=1,
                                   total_price=10, status="pending", expires_at=timezone.now() - timedelta(hours=1))
        Payment.objects.create(booking=b, amount=10, platform_fee=1, host_payout=9, status="reported")
        c = Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(9), check_out=day(10), guests=1,
                                   total_price=10, status="confirmed")
        from apps.bookings.services import expire_pending_bookings

        self.assertEqual(expire_pending_bookings(), 0)
        b.refresh_from_db(), c.refresh_from_db()
        self.assertEqual((b.status, c.status), ("pending", "confirmed"))

    def test_emails_sent_on_commit_and_failures_never_break_booking(self):
        self.login(self.guest)
        with self.captureOnCommitCallbacks(execute=True):
            r = self.book(self.guest)
        self.assertEqual(r.status_code, 201)
        subjects = [m.subject for m in mail.outbox]
        self.assertTrue(any("recibida" in s for s in subjects))  # al huésped
        self.assertTrue(any("Nueva reserva" in s for s in subjects))  # al anfitrión
        from unittest import mock

        with mock.patch("shared.notifications.send_mail", side_effect=OSError("SMTP caído")):
            with self.captureOnCommitCallbacks(execute=True):
                r = self.book(self.other, ci=20, co=22)
        self.assertEqual(r.status_code, 201)  # el error de correo solo se registra
