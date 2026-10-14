from apps.bookings.models import Booking
from shared.csv_utils import safe_cell
from shared.testing import BaseAPITest, day, make_listing, make_user


class ReportTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.host2 = make_user("anfitrion2", "host")
        self.listing2 = make_listing(self.host2, title="=HYPERLINK(\"http://malo\")")
        Booking.objects.create(listing=self.listing, guest=self.guest, check_in=day(2), check_out=day(4), guests=2,
                               total_price=100000, status="confirmed")
        Booking.objects.create(listing=self.listing, guest=self.other, check_in=day(6), check_out=day(7), guests=3,
                               total_price=50000, status="pending")
        Booking.objects.create(listing=self.listing, guest=self.other, check_in=day(9), check_out=day(10), guests=9,
                               total_price=9, status="cancelled")
        Booking.objects.create(listing=self.listing2, guest=self.guest, check_in=day(2), check_out=day(3), guests=1,
                               total_price=7000, status="confirmed")

    def test_host_sees_only_own_listings_and_ignores_cancelled(self):
        self.login(self.host)
        r = self.client.get("/api/v1/reports/summary/")
        self.assertEqual(r.data["totals"], {"bookings": 2, "tourists": 5, "projected_revenue": "150000.00"})
        self.assertEqual(len(r.data["by_listing"]), 1)
        self.assertEqual(sum(m["bookings"] for m in r.data["by_month"]), 2)

    def test_staff_sees_everything(self):
        admin = make_user("admin", "host", is_staff=True)
        self.login(admin)
        self.assertEqual(self.client.get("/api/v1/reports/summary/").data["totals"]["bookings"], 3)

    def test_guests_forbidden_and_range_validated(self):
        self.login(self.guest)
        self.assertEqual(self.client.get("/api/v1/reports/summary/").status_code, 403)
        self.login(self.host)
        self.assertEqual(self.client.get("/api/v1/reports/summary/?from=2026-13-01").status_code, 400)
        self.assertEqual(self.client.get(f"/api/v1/reports/summary/?from={day(5)}&to={day(1)}").status_code, 400)
        r = self.client.get(f"/api/v1/reports/summary/?from={day(5)}")
        self.assertEqual(r.data["totals"]["bookings"], 1)

    def test_csv_exports_and_formula_escape(self):
        self.login(self.host)
        r = self.client.get("/api/v1/reports/bookings.csv")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r["Content-Type"].startswith("text/csv"))
        self.assertIn("attachment", r["Content-Disposition"])
        self.assertEqual(r.content.decode("utf-8-sig").count("\n"), 3)  # cabecera + 2 reservas
        admin = make_user("admin", "host", is_staff=True)
        self.login(admin)
        body = self.client.get("/api/v1/reports/bookings.csv").content.decode("utf-8-sig")
        self.assertIn("'=HYPERLINK", body)
        self.assertNotIn(",=HYPERLINK", body)
        guests = self.client.get("/api/v1/reports/guests.csv").content.decode("utf-8-sig")
        self.assertIn("huesped", guests)

    def test_safe_cell(self):
        self.assertEqual(safe_cell("=1+1"), "'=1+1")
        self.assertEqual(safe_cell("@cmd"), "'@cmd")
        self.assertEqual(safe_cell("normal"), "normal")
        self.assertEqual(safe_cell(-5), -5)
