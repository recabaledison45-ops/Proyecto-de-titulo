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


GATEWAYS = {"simulated": SimulatedGateway, "bank_transfer": BankTransferGateway}


def get_gateway(name=None):
    return GATEWAYS[name or settings.PAYMENT_GATEWAY]()
