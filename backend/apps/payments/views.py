from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView

from apps.bookings.models import Booking
from shared.permissions import IsHostOrStaff

from . import selectors, services
from .serializers import PaymentCreateSerializer, PaymentSerializer


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
