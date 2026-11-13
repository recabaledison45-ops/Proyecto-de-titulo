"""Pago con tarjeta por Webpay Plus. Transbank se simula: aquí se prueba NUESTRA lógica, no su servicio."""
from datetime import timedelta
from unittest.mock import patch

from django.test import override_settings
from django.utils import timezone

from apps.bookings.models import Booking
from apps.payments.models import Payment
from apps.payments.webpay import WebpayClient, WebpayError
from shared.testing import BaseAPITest

RETURN = "/api/v1/payments/webpay/return/"


class FakeWebpay:
    """Imita las respuestas de la API de Webpay Plus v1.2."""

    def __init__(self):
        self.calls = []
        self.tokens = 0
        self.commit_status, self.response_code = "AUTHORIZED", 0
        self.amount_override = None
        self.fail_commit = self.fail_refund = self.fail_create = self.charged_anyway = False
        self.created = {}

    def __call__(self, method, path="", body=None):
        self.calls.append((method, path, body))
        if method == "POST" and path == "":
            if self.fail_create:
                raise WebpayError("sin red")
            self.tokens += 1
            token = f"tok{self.tokens:02d}".ljust(64, "x")
            self.created[token] = body
            return {"token": token, "url": "https://webpay3gint.transbank.cl/webpayserver/initTransaction"}
        token = path.strip("/").split("/")[0]
        if method in ("PUT", "GET"):
            if method == "PUT" and self.fail_commit:
                raise WebpayError("sin red")
            if method == "GET" and not self.charged_anyway:
                return {"status": "INITIALIZED", "amount": self.created[token]["amount"]}
            order = self.created[token]
            return {
                "vci": "TSY", "amount": self.amount_override or order["amount"], "status": self.commit_status,
                "buy_order": order["buy_order"], "session_id": order["session_id"],
                "card_detail": {"card_number": "6623"}, "accounting_date": "1112",
                "transaction_date": "2026-11-12T23:59:00.000Z", "authorization_code": "1213",
                "payment_type_code": "VN", "response_code": self.response_code, "installments_number": 0,
            }
        if method == "POST" and path.endswith("/refunds"):
            if self.fail_refund:
                raise WebpayError("no se pudo anular")
            return {"type": "REVERSED"}
        raise AssertionError(f"llamada inesperada: {method} {path}")


@override_settings(FRONTEND_URL="https://app.test")
class WebpayTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.fake = FakeWebpay()
        patcher = patch.object(WebpayClient, "_request", side_effect=self.fake)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.booking = self.book(self.guest, ci=5, co=7).data  # 2 noches × 50.000 = 100.000

    def start(self, user=None):
        self.login(user or self.guest)
        return self.client.post("/api/v1/payments/webpay/", {"booking": self.booking["id"]}, format="json")

    def come_back(self, token, **extra):
        self.logout()  # Transbank devuelve al navegador sin nuestra cabecera de sesión
        return self.client.get(RETURN, {"token_ws": token, **extra})

    def state(self):
        return Payment.objects.get(booking_id=self.booking["id"]).status, Booking.objects.get(pk=self.booking["id"]).status

    # ---- inicio
    def test_start_creates_pending_payment_and_sends_real_amount_and_return_url(self):
        r = self.start()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(set(r.data), {"payment", "url", "token"})
        method, path, body = self.fake.calls[0]
        self.assertEqual((method, path, body["amount"]), ("POST", "", 100000))
        self.assertTrue(body["return_url"].endswith(RETURN))
        self.assertLessEqual(len(body["buy_order"]), 26)
        p = Payment.objects.get(pk=r.data["payment"])
        self.assertEqual((p.status, p.method, str(p.platform_fee), str(p.host_payout)), ("pending", "webpay", "10000.00", "90000.00"))
        self.assertEqual(Booking.objects.get(pk=self.booking["id"]).status, "pending")  # aún no hay cobro

    def test_only_the_guest_can_start_and_only_while_pending(self):
        self.assertEqual(self.start(self.other).status_code, 403)
        self.assertEqual(self.start(self.host).status_code, 403)
        Booking.objects.filter(pk=self.booking["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(self.start().status_code, 409)
        self.assertEqual(Payment.objects.count(), 0)

    def test_start_requires_login(self):
        self.logout()
        self.assertEqual(self.client.post("/api/v1/payments/webpay/", {"booking": self.booking["id"]}, format="json").status_code, 401)

    def test_webpay_down_returns_503_and_leaves_nothing_behind(self):
        self.fake.fail_create = True
        self.assertEqual(self.start().status_code, 503)
        self.assertEqual(Payment.objects.count(), 0)

    @override_settings(WEBPAY_ENABLED=False)
    def test_disabled_returns_404_and_is_not_offered(self):
        self.assertEqual(self.start().status_code, 404)
        info = self.client.get(f"/api/v1/bookings/{self.booking['id']}/payment-info/").data
        self.assertEqual(info["methods"], ["bank_transfer"])

    def test_payment_info_offers_card_and_flags_test_mode(self):
        self.login(self.guest)
        info = self.client.get(f"/api/v1/bookings/{self.booking['id']}/payment-info/").data
        self.assertEqual((info["methods"], info["webpay_test_mode"]), (["webpay", "bank_transfer"], True))

    # ---- retorno
    def test_approved_payment_confirms_booking_and_exposes_receipt(self):
        token = self.start().data["token"]
        r = self.come_back(token)
        self.assertEqual((r.status_code, r["Location"]), (302, f"https://app.test/payments/result?status=success&booking={self.booking['id']}"))
        self.assertEqual(self.state(), ("succeeded", "confirmed"))
        self.login(self.guest)
        payment = self.client.get("/api/v1/bookings/", {"as": "guest"}).data["results"][0]["payment"]
        self.assertEqual((payment["receipt"]["authorization_code"], payment["receipt"]["card_last4"]), ("1213", "6623"))

    def test_return_is_idempotent_and_commits_only_once(self):
        token = self.start().data["token"]
        self.come_back(token)
        r = self.come_back(token)
        self.assertIn("status=success", r["Location"])
        self.assertEqual(sum(1 for c in self.fake.calls if c[0] == "PUT"), 1)

    def test_return_also_works_by_form_post(self):
        token = self.start().data["token"]
        self.logout()
        r = self.client.post(RETURN, {"token_ws": token})  # multipart/form
        self.assertEqual(r.status_code, 415)  # multipart no se acepta...
        r = self.client.post(RETURN, f"token_ws={token}", content_type="application/x-www-form-urlencoded")
        self.assertIn("status=success", r["Location"])  # ...el formulario estándar sí

    def test_rejected_card_fails_payment_keeps_booking_pending_and_allows_retry(self):
        self.fake.commit_status, self.fake.response_code = "FAILED", -1
        first = self.start().data["token"]
        self.assertIn("status=failed", self.come_back(first)["Location"])
        self.assertEqual(self.state(), ("failed", "pending"))
        self.fake.commit_status, self.fake.response_code = "AUTHORIZED", 0
        second = self.start().data["token"]
        self.assertNotEqual(first, second)
        self.assertIn("status=success", self.come_back(second)["Location"])
        self.assertEqual(self.state(), ("succeeded", "confirmed"))
        self.assertEqual(Payment.objects.count(), 1)

    def test_user_cancels_on_webpay_form(self):
        token = self.start().data["token"]
        order = Payment.objects.get().buy_order
        self.logout()
        r = self.client.get(RETURN, {"TBK_TOKEN": token, "TBK_ORDEN_COMPRA": order, "TBK_ID_SESION": "x"})
        self.assertIn("status=cancelled", r["Location"])
        self.assertEqual(self.state(), ("failed", "pending"))
        self.assertFalse(any(c[0] == "PUT" for c in self.fake.calls))  # nunca se confirma un pago anulado

    def test_timeout_on_webpay_form_is_matched_by_buy_order(self):
        self.start()
        self.logout()
        r = self.client.get(RETURN, {"TBK_ORDEN_COMPRA": Payment.objects.get().buy_order, "TBK_ID_SESION": "x"})
        self.assertIn("status=cancelled", r["Location"])
        self.assertEqual(self.state(), ("failed", "pending"))

    def test_unknown_or_missing_token_changes_nothing(self):
        self.start()
        for params in ({"token_ws": "no-existe"}, {}):
            self.assertIn("status=", self.client.get(RETURN, params)["Location"])
        self.assertEqual(self.state(), ("pending", "pending"))

    def test_commit_network_error_keeps_payment_pending(self):
        token = self.start().data["token"]
        self.fake.fail_commit = True
        self.assertIn("status=error", self.come_back(token)["Location"])
        self.assertEqual(self.state(), ("pending", "pending"))
        self.fake.fail_commit = False
        self.assertIn("status=success", self.come_back(token)["Location"])  # reintento del mismo retorno

    def test_lost_commit_response_is_recovered_from_transaction_status(self):
        """Transbank cobró pero la respuesta se perdió: no se deja al huésped con un cargo y sin reserva."""
        token = self.start().data["token"]
        self.fake.fail_commit = self.fake.charged_anyway = True
        self.assertIn("status=success", self.come_back(token)["Location"])
        self.assertEqual(self.state(), ("succeeded", "confirmed"))

    def test_amount_mismatch_is_refunded_not_accepted(self):
        token = self.start().data["token"]
        self.fake.amount_override = 1
        self.assertIn("status=refunded", self.come_back(token)["Location"])
        self.assertEqual(self.state(), ("refunded", "pending"))

    def test_booking_expired_while_paying_is_refunded(self):
        token = self.start().data["token"]
        Booking.objects.filter(pk=self.booking["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertIn("status=refunded", self.come_back(token)["Location"])
        self.assertEqual(self.state()[0], "refunded")
        self.assertTrue(any(c[1].endswith("/refunds") for c in self.fake.calls))

    # ---- después del pago
    def test_cancelling_a_paid_booking_refunds_the_card(self):
        self.come_back(self.start().data["token"])
        self.login(self.guest)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{self.booking['id']}/cancel/").status_code, 200)
        p = Payment.objects.get()
        self.assertEqual(p.status, "refunded")
        refund = [c for c in self.fake.calls if c[1].endswith("/refunds")][0]
        self.assertEqual(refund[2], {"amount": 100000})

    def test_refund_failure_does_not_block_cancellation_and_is_flagged(self):
        self.come_back(self.start().data["token"])
        self.fake.fail_refund = True
        self.login(self.guest)
        self.assertEqual(self.client.post(f"/api/v1/bookings/{self.booking['id']}/cancel/").status_code, 200)
        self.assertEqual(self.state(), ("refund_pending", "cancelled"))

    def test_cancelling_with_card_payment_in_progress_discards_it(self):
        token = self.start().data["token"]
        self.client.post(f"/api/v1/bookings/{self.booking['id']}/cancel/")
        self.assertEqual(self.state(), ("failed", "cancelled"))
        self.assertIn("status=failed", self.come_back(token)["Location"])  # un retorno tardío no revive nada
        self.assertFalse(any(c[0] == "PUT" for c in self.fake.calls))

    def test_can_switch_to_bank_transfer_after_a_failed_card_attempt(self):
        self.fake.commit_status, self.fake.response_code = "FAILED", -1
        self.come_back(self.start().data["token"])
        self.login(self.guest)
        r = self.client.post("/api/v1/payments/", {"booking": self.booking["id"]}, format="json")
        self.assertEqual((r.status_code, r.data["status"], r.data["method"]), (201, "reported", "bank_transfer"))
        self.assertEqual(self.start().status_code, 409)  # con una transferencia informada ya no se paga con tarjeta

    def test_paid_booking_cannot_be_paid_again(self):
        self.come_back(self.start().data["token"])
        self.assertEqual(self.start().status_code, 409)
        self.login(self.guest)
        self.assertEqual(self.client.post("/api/v1/payments/", {"booking": self.booking["id"]}, format="json").status_code, 409)


class WebpaySettingsTests(BaseAPITest):
    def test_integration_uses_transbank_public_test_credentials(self):
        client = WebpayClient()
        self.assertEqual((client.base_url, client.commerce_code), ("https://webpay3gint.transbank.cl", "597055555532"))

    @override_settings(WEBPAY_ENV="production", WEBPAY_COMMERCE_CODE="597012345678", WEBPAY_API_KEY="k")
    def test_production_uses_production_host(self):
        self.assertEqual(WebpayClient().base_url, "https://webpay3g.transbank.cl")
