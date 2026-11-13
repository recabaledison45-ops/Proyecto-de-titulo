"""Pasarelas de pago intercambiables. Para Webpay/Stripe basta con otra subclase y PAYMENT_GATEWAY."""
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass

from django.conf import settings

from shared.exceptions import PaymentRejected


@dataclass
class GatewayResult:
    status: str  # "succeeded" (cobro inmediato) o "reported" (a la espera de confirmación manual)
    reference: str


class PaymentGateway(ABC):
    method = ""

    @abstractmethod
    def charge(self, *, booking, amount) -> GatewayResult: ...

    @abstractmethod
    def refund(self, *, payment) -> str: ...


class SimulatedGateway(PaymentGateway):
    method = "simulated"

    def charge(self, *, booking, amount):
        if settings.SIMULATED_GATEWAY_DECLINE:
            raise PaymentRejected()
        return GatewayResult(status="succeeded", reference=f"SIM-{uuid.uuid4().hex[:12].upper()}")

    def refund(self, *, payment):
        return f"SIM-REF-{uuid.uuid4().hex[:12].upper()}"


class BankTransferGateway(PaymentGateway):
    """El huésped transfiere y lo informa; el anfitrión confirma la recepción. El reembolso es manual."""

    method = "bank_transfer"

    def charge(self, *, booking, amount):
        return GatewayResult(status="reported", reference=f"WEXP-{booking.pk}")

    def refund(self, *, payment):
        return f"MANUAL-REF-{payment.pk}"


class WebpayGateway(PaymentGateway):
    """Tarjeta por Webpay Plus. El cobro es en dos pasos (ver services.start_webpay / finish_webpay), no con charge()."""

    method = "webpay"

    def charge(self, *, booking, amount):
        raise NotImplementedError("Webpay se inicia con services.start_webpay().")

    def refund(self, *, payment):
        from .webpay import WebpayClient  # import tardío: evita cargar la configuración si no se usa

        result = WebpayClient().refund(payment.gateway_token, int(payment.amount))
        return f"WEBPAY-{result.get('type', 'REFUND')}-{result.get('authorization_code') or payment.pk}"


GATEWAYS = {"simulated": SimulatedGateway, "bank_transfer": BankTransferGateway, "webpay": WebpayGateway}


def get_gateway(name=None):
    return GATEWAYS[name or settings.PAYMENT_GATEWAY]()
