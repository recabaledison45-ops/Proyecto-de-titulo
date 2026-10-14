from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.permissions import IsHostOrStaff

from . import selectors, services
from .models import Booking
from .serializers import BookingCreateSerializer, BookingSerializer, NotesSerializer, ReasonSerializer


def _ctx(request):
    return {"request": request}


def _booking_or_404(pk):
    return get_object_or_404(selectors.base_queryset(), pk=pk)


class BookingListCreateView(ListAPIView):
    serializer_class = BookingSerializer

    def get_queryset(self):
        role = self.request.query_params.get("as", "guest")
        status_filter = self.request.query_params.get("status") or None
        if status_filter and status_filter not in Booking.Status.values:
            raise ValidationError({"status": ["Estado inválido."]})
        if role == "host":
            return selectors.bookings_for_host(self.request.user, status_filter)
        if role != "guest":
            raise ValidationError({"as": ["Use guest o host."]})
        return selectors.bookings_for_guest(self.request.user, status_filter)

    def get_serializer_context(self):
        return _ctx(self.request)

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        booking = services.create_booking(
            guest=request.user, listing_id=d["listing"], check_in=d["check_in"], check_out=d["check_out"],
            guests=d["guests"],
        )
        return Response(BookingSerializer(selectors.get_booking(booking.pk), context=_ctx(request)).data,
                        status=status.HTTP_201_CREATED)


class _BookingAction(APIView):
    def respond(self, request, booking):
        return Response(BookingSerializer(selectors.get_booking(booking.pk), context=_ctx(request)).data)


class CancelView(_BookingAction):
    def post(self, request, pk):
        booking = _booking_or_404(pk)
        reason = ReasonSerializer(data=request.data)
        reason.is_valid(raise_exception=True)
        services.cancel_booking(booking=booking, actor=request.user, reason=reason.validated_data["reason"])
        return self.respond(request, booking)


class RejectView(_BookingAction):
    permission_classes = [IsHostOrStaff]

    def post(self, request, pk):
        booking = _booking_or_404(pk)
        reason = ReasonSerializer(data=request.data)
        reason.is_valid(raise_exception=True)
        services.reject_booking(booking=booking, actor=request.user, reason=reason.validated_data["reason"])
        return self.respond(request, booking)


class CompleteView(_BookingAction):
    permission_classes = [IsHostOrStaff]

    def post(self, request, pk):
        booking = _booking_or_404(pk)
        services.complete_booking(booking=booking, actor=request.user)
        return self.respond(request, booking)


class NotesView(_BookingAction):
    permission_classes = [IsHostOrStaff]

    def patch(self, request, pk):
        booking = _booking_or_404(pk)
        data = NotesSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.update_notes(booking=booking, actor=request.user, host_notes=data.validated_data["host_notes"])
        return self.respond(request, booking)


# ---------------- Reportes ----------------
def _parse_range(request):
    from datetime import date

    out = []
    for key in ("from", "to"):
        raw = request.query_params.get(key)
        try:
            out.append(date.fromisoformat(raw) if raw else None)
        except ValueError as exc:
            raise ValidationError({key: ["Fecha inválida (use AAAA-MM-DD)."]}) from exc
    if out[0] and out[1] and out[0] > out[1]:
        raise ValidationError({"from": ["El inicio no puede ser posterior al fin."]})
    return out


class ReportSummaryView(APIView):
    permission_classes = [IsHostOrStaff]

    def get(self, request):
        date_from, date_to = _parse_range(request)
        return Response(selectors.report_summary(request.user, date_from, date_to))


class ReportBookingsCsvView(APIView):
    permission_classes = [IsHostOrStaff]

    def get(self, request):
        from shared.csv_utils import csv_response

        date_from, date_to = _parse_range(request)
        rows = [
            [b.pk, b.listing.title, b.guest.username, b.guest.email, b.check_in, b.check_out, b.guests,
             b.total_price, b.get_status_display()]
            for b in selectors.report_queryset(request.user, date_from, date_to).order_by("check_in", "id")
        ]
        header = ["id", "oferta", "huesped", "correo", "llegada", "salida", "personas", "total", "estado"]
        return csv_response("reservas.csv", header, rows)


class ReportGuestsCsvView(APIView):
    permission_classes = [IsHostOrStaff]

    def get(self, request):
        from shared.csv_utils import csv_response

        date_from, date_to = _parse_range(request)
        agg = {}
        for b in selectors.report_queryset(request.user, date_from, date_to).order_by("guest_id"):
            row = agg.setdefault(b.guest_id, [b.guest.username, b.guest.email, b.guest.phone, 0, 0, 0])
            row[3] += 1
            row[4] += b.guests
            row[5] += b.total_price
        header = ["usuario", "correo", "telefono", "reservas", "personas", "total"]
        return csv_response("clientes.csv", header, list(agg.values()))
