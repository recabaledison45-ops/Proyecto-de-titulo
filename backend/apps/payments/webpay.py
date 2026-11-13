"""Cliente mínimo de Webpay Plus (Transbank, API REST v1.2).

Flujo:  create() → el navegador del huésped va a `url` con `token_ws` → paga en Transbank →
Transbank lo devuelve a `return_url` con `token_ws` → commit() confirma el cargo.
Si no se llama a commit(), Transbank reversa sola la transacción (no hay cobro).

Documentación: https://www.transbankdevelopers.cl/referencia/webpay
Las credenciales de INTEGRACIÓN son públicas (las publica Transbank para pruebas); las de producción se
obtienen al contratar Webpay Plus y validar la integración con Transbank.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

HOSTS = {
    "integration": "https://webpay3gint.transbank.cl",
    "production": "https://webpay3g.transbank.cl",
}
API_PATH = "/rswebpaytransaction/api/webpay/v1.2/transactions"

# Credenciales públicas del ambiente de integración (Webpay Plus)
INTEGRATION_COMMERCE_CODE = "597055555532"
INTEGRATION_API_KEY = "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C"


class WebpayError(Exception):
    """Webpay no respondió o respondió con error (red, credenciales, token inválido...)."""


class WebpayClient:
    def __init__(self):
        self.base_url = (settings.WEBPAY_BASE_URL or HOSTS[settings.WEBPAY_ENV]).rstrip("/")
        self.commerce_code = settings.WEBPAY_COMMERCE_CODE
        self.api_key = settings.WEBPAY_API_KEY
        self.timeout = settings.WEBPAY_TIMEOUT

    def _request(self, method, path="", body=None):
        request = urllib.request.Request(
            f"{self.base_url}{API_PATH}{path}",
            data=json.dumps(body).encode() if body is not None else None,
            method=method,
            headers={
                "Tbk-Api-Key-Id": self.commerce_code,
                "Tbk-Api-Key-Secret": self.api_key,
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:  # noqa: S310 (URL fija https)
                raw = response.read().decode() or "{}"
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:300]
            logger.warning("Webpay respondió HTTP %s en %s %s: %s", exc.code, method, path[:12], detail)
            raise WebpayError(f"Webpay respondió HTTP {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            logger.warning("No se pudo contactar a Webpay (%s %s): %s", method, path[:12], exc)
            raise WebpayError("No se pudo contactar a Webpay") from exc
        try:
            return json.loads(raw)
        except ValueError as exc:
            raise WebpayError("Respuesta de Webpay ilegible") from exc

    def create(self, *, buy_order, session_id, amount, return_url):
        """Inicia la transacción. Devuelve {"token": ..., "url": ...}."""
        data = self._request("POST", body={
            "buy_order": buy_order, "session_id": session_id, "amount": amount, "return_url": return_url,
        })
        if not data.get("token") or not data.get("url"):
            raise WebpayError("Webpay no entregó token/url")
        return data

    def commit(self, token):
        """Confirma el cargo. Devuelve el detalle (status, response_code, amount, authorization_code...)."""
        return self._request("PUT", f"/{token}")

    def status(self, token):
        return self._request("GET", f"/{token}")

    def refund(self, token, amount):
        """Reversa o anula. Devuelve {"type": "REVERSED" | "NULLIFIED", ...}."""
        return self._request("POST", f"/{token}/refunds", body={"amount": amount})


def is_approved(detail):
    return detail.get("status") == "AUTHORIZED" and detail.get("response_code") == 0
