from datetime import timedelta
from decimal import Decimal

from django.test import override_settings
from django.utils import timezone

from apps.bookings.models import Booking
from apps.payments.models import Payment
from shared.testing import BaseAPITest, day


class BankTransferTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.host.bank_details = "Banco X · cuenta 123"
        self.host.save()
        self.booking = self.book(self.guest).data

    def pay(self, user=None):
        if user:
            self.login(user)
        return self.client.post("/api/v1/payments/", {"booking": self.booking["id"]}, format="json")

    def test_payment_info_only_for_the_guest(self):
        url = f"/api/v1/bookings/{self.booking['id']}/payment-info/"
        self.login(self.guest)
        r = self.client.get(url)
        self.assertEqual((r.status_code, r.data["bank_details"], r.data["reference"]), (200, "Banco X · cuenta 123", f"WEXP-{self.booking['id']}"))
        for user in (self.host, self.other):
            self.login(user)
            self.assertEqual(self.client.get(url).status_code, 403)

    def test_report_then_host_confirms_with_commission_and_net(self):
        r = self.pay(self.guest)
        self.assertEqual((r.status_code, r.data["status"]), (201, "reported"))
        self.assertEqual(Booking.objects.get(pk=self.booking["id"]).status, "pending")  # sigue pendiente
        self.login(self.host)
        c = self.client.post(f"/api/v1/payments/{r.data['id']}/confirm/")
        self.assertEqual((c.status_code, c.data["status"]), (200, "succeeded"))
        self.assertEqual(Decimal(c.data["platform_fee"]), Decimal("15000.00"))  # 10 % de 150.000
        self.assertEqual(Decimal(c.data["host_payout"]), Decimal("135000.00"))
        b = Booking.objects.get(pk=self.booking["id"])
        self.assertEqual((b.status, b.expires_at), ("confirmed", None))

    def test_only_host_or_staff_can_confirm(self):
        pid = self.pay(self.guest).data["id"]
        for user in (self.guest, self.other):
            self.login(user)
            self.assertEqual(self.client.post(f"/api/v1/payments/{pid}/confirm/").status_code, 403)
        admin = self.other
        admin.is_staff = True
        admin.save()
        self.assertEqual(self.client.post(f"/api/v1/payments/{pid}/confirm/").status_code, 200)

    def test_only_the_guest_can_pay_and_only_once(self):
        self.assertEqual(self.pay(self.other).status_code, 403)
        self.assertEqual(self.pay(self.guest).status_code, 201)
        self.assertEqual(self.pay().status_code, 409)

    def test_expired_booking_cannot_be_paid(self):
        Booking.objects.filter(pk=self.booking["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(self.pay(self.guest).status_code, 409)

    def test_cancel_with_reported_payment_marks_it_failed_not_refunded(self):
        pid = self.pay(self.guest).data["id"]
        self.client.post(f"/api/v1/bookings/{self.booking['id']}/cancel/")
        self.assertEqual(Payment.objects.get(pk=pid).status, "failed")

    def test_cannot_confirm_after_booking_cancelled(self):
        pid = self.pay(self.guest).data["id"]
        self.login(self.host)
        self.client.post(f"/api/v1/bookings/{self.booking['id']}/reject/", {"reason": "x"})
        self.assertEqual(self.client.post(f"/api/v1/payments/{pid}/confirm/").status_code, 409)


@override_settings(PAYMENT_GATEWAY="simulated")
class SimulatedGatewayTests(BaseAPITest):
    def test_charge_confirms_booking_and_refund_on_cancel(self):
        b = self.book(self.guest, ci=5, co=7).data  # 100.000
        r = self.client.post("/api/v1/payments/", {"booking": b["id"]}, format="json")
        self.assertEqual((r.status_code, r.data["status"], r.data["method"]), (201, "succeeded", "simulated"))
        self.assertEqual(Decimal(r.data["platform_fee"]), Decimal("10000.00"))
        self.assertEqual(Decimal(r.data["host_payout"]), Decimal("90000.00"))
        self.assertEqual(Booking.objects.get(pk=b["id"]).status, "confirmed")
        self.assertEqual(self.client.post(f"/api/v1/bookings/{b['id']}/cancel/").status_code, 200)
        p = Payment.objects.get(pk=r.data["id"])
        self.assertEqual(p.status, "refunded")
        self.assertIsNotNone(p.refunded_at)
        self.assertEqual(self.book(self.other, ci=5, co=7).status_code, 201)  # fechas liberadas

    @override_settings(SIMULATED_GATEWAY_DECLINE=True)
    def test_declined_payment_returns_402_and_keeps_booking_pending(self):
        b = self.book(self.guest).data
        r = self.client.post("/api/v1/payments/", {"booking": b["id"]}, format="json")
        self.assertEqual(r.status_code, 402)
        self.assertEqual(Payment.objects.count(), 0)
        self.assertEqual(Booking.objects.get(pk=b["id"]).status, "pending")

    @override_settings(PLATFORM_FEE_PERCENT=Decimal("12.5"))
    def test_fee_percent_is_configurable(self):
        from apps.payments.services import calculate_split

        self.assertEqual(calculate_split(Decimal("80000")), (Decimal("10000.00"), Decimal("70000.00")))
