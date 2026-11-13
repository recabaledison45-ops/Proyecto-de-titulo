from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Conflicto con el estado actual del recurso."
    default_code = "conflict"


class PaymentRejected(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "La pasarela rechazó el pago."
    default_code = "payment_rejected"


class ServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "El servicio de pago con tarjeta no está disponible en este momento. Intenta de nuevo en unos minutos."
    default_code = "payment_unavailable"


def api_exception_handler(exc, context):
    """Respuestas de error uniformes: {detail, code} o {campo: [mensajes]}."""
    response = exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict) and "detail" in response.data:
        detail = response.data["detail"]
        response.data = {"detail": str(detail), "code": getattr(detail, "code", "error")}
    return response
