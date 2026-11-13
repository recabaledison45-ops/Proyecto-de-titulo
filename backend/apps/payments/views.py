from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework.parsers import FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView

from apps.bookings.models import Booking
from shared.permissions import IsHostOrStaff

from . import selectors, services
from .serializers import PaymentCreateSerializer, PaymentSerializer, WebpayStartSerializer


@extend_schema(summary="Pagar / informar pago de una reserva", request=PaymentCreateSerializer, responses={201: PaymentSerializer})
class PaymentCreateView(APIView):
    def post(self, request):
        data = PaymentCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payment = services.create_payment(guest=request.user, booking_id=data.validated_data["booking"])
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


@extend_schema(summary="Confirmar pago (anfitrión)", request=None, responses=PaymentSerializer)
class PaymentConfirmView(APIView):
    permission_classes = [IsHostOrStaff]

    def post(self, request, pk):
        payment = services.confirm_payment(payment_id=pk, actor=request.user)
        return Response(PaymentSerializer(selectors.get_payment(payment.pk)).data)


@extend_schema(summary="Monto, referencia y datos bancarios de una reserva", responses={200: OpenApiTypes.OBJECT})
class PaymentInfoView(APIView):
    def get(self, request, pk):
        booking = get_object_or_404(Booking.objects.select_related("listing__host"), pk=pk)
        return Response(services.payment_info(booking=booking, user=request.user))


@extend_schema(summary="Iniciar pago con tarjeta (Webpay Plus)", request=PaymentCreateSerializer, responses={201: WebpayStartSerializer})
class WebpayStartView(APIView):
    """Crea la transacción en Webpay. El frontend debe enviar al navegador a `url` con el campo `token_ws`."""

    def post(self, request):
        data = PaymentCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        return_url = settings.WEBPAY_RETURN_URL or request.build_absolute_uri(reverse("payment-webpay-return"))
        payment, url = services.start_webpay(guest=request.user, booking_id=data.validated_data["booking"], return_url=return_url)
        return Response({"payment": payment.pk, "url": url, "token": payment.gateway_token}, status=status.HTTP_201_CREATED)


@method_decorator(never_cache, name="dispatch")
class WebpayReturnView(APIView):
    """Retorno del navegador desde Webpay (sin sesión: la credencial es el token de la transacción).

    Confirma el cargo en el servidor y redirige al frontend, que muestra el comprobante leyendo el estado real por la API.
    Casos: pago normal (`token_ws`), anulado por el usuario (`TBK_TOKEN`), tiempo agotado (solo `TBK_ORDEN_COMPRA`).
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [FormParser, JSONParser]  # Transbank puede volver por GET o por POST de formulario

    @extend_schema(exclude=True)
    def get(self, request):
        return self._handle(request.query_params)

    @extend_schema(exclude=True)
    def post(self, request):
        return self._handle(request.data)

    def _handle(self, params):
        token = str(params.get("token_ws") or "")[:64]
        aborted_token = str(params.get("TBK_TOKEN") or "")[:64]
        buy_order = str(params.get("TBK_ORDEN_COMPRA") or "")[:26]
        if token and not aborted_token:
            payment, result = services.finish_webpay(token=token)
        else:
            payment, result = services.abort_webpay(token=aborted_token, buy_order=buy_order), "cancelled"
        query = {"status": result}
        if payment is not None:
            query["booking"] = payment.booking_id
        return HttpResponseRedirect(f"{settings.FRONTEND_URL.rstrip('/')}/payments/result?{urlencode(query)}")
