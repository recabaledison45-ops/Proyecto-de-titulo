"""Consultas de lectura de reservas. `active_q` es la única definición de «reserva que bloquea fechas»."""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from .models import Booking

S = Booking.Status


def _money(value):
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


def active_q(now=None):
    """Confirmadas/finalizadas, o pendientes vigentes (no vencidas, o con pago informado a la espera del anfitrión)."""
    now = now or timezone.now()
    pending_alive = Q(status=S.PENDING) & (
        Q(expires_at__isnull=True) | Q(expires_at__gt=now) | Q(payment__status="reported")
    )
    return Q(status__in=[S.CONFIRMED, S.COMPLETED]) | pending_alive


def base_queryset():
    return Booking.objects.select_related("listing", "listing__host", "guest", "payment").prefetch_related("reviews")


def get_booking(pk):
    return base_queryset().get(pk=pk)


def overlapping(check_in, check_out, **filters):
    """Reservas activas cuyo rango solapa con [check_in, check_out). Salida = llegada NO es solape."""
    return Booking.objects.filter(active_q(), check_in__lt=check_out, check_out__gt=check_in, **filters).distinct()


def exclusive_conflict_exists(listing, check_in, check_out):
    return overlapping(check_in, check_out, listing=listing).exists()


def occupancy(listing, start, end):
    """{fecha: personas reservadas esa noche} para las noches en [start, end)."""
    result = {}
    for b in overlapping(start, end, listing=listing):
        first, last = max(b.check_in, start), min(b.check_out, end)
        for n in range((last - first).days):
            d = first + timedelta(days=n)
            result[d] = result.get(d, 0) + b.guests
    return result


def peak_occupancy(listing, check_in, check_out):
    return max(occupancy(listing, check_in, check_out).values(), default=0)


def unavailable_listing_ids(check_in, check_out, guests=1):
    """Ofertas sin disponibilidad para el rango: exclusivas con solape, o compartidas sin cupos suficientes."""
    ids = set(
        overlapping(check_in, check_out, listing__booking_mode="exclusive").values_list("listing_id", flat=True)
    )
    shared = {}
    for b in overlapping(check_in, check_out, listing__booking_mode="shared").select_related("listing"):
        first, last = max(b.check_in, check_in), min(b.check_out, check_out)
        per_night = shared.setdefault(b.listing_id, {"cap": b.listing.max_guests, "nights": {}})["nights"]
        for n in range((last - first).days):
            d = first + timedelta(days=n)
            per_night[d] = per_night.get(d, 0) + b.guests
    for listing_id, info in shared.items():
        if any(taken + guests > info["cap"] for taken in info["nights"].values()):
            ids.add(listing_id)
    return ids


def has_open_bookings(listing):
    today = timezone.localdate()
    return Booking.objects.filter(
        Q(status=S.CONFIRMED) | (Q(status=S.PENDING) & active_q()), listing=listing, check_out__gte=today
    ).exists()


def bookings_for_guest(user, status=None):
    qs = base_queryset().filter(guest=user)
    return qs.filter(status=status) if status else qs


def bookings_for_host(user, status=None):
    qs = base_queryset() if user.is_staff else base_queryset().filter(listing__host=user)
    return qs.filter(status=status) if status else qs


# ---------------- Reportes (F-51) ----------------
def report_queryset(user, date_from=None, date_to=None):
    qs = Booking.objects.exclude(status__in=[S.CANCELLED, S.REJECTED]).select_related("listing", "guest")
    if not user.is_staff:
        qs = qs.filter(listing__host=user)
    if date_from:
        qs = qs.filter(check_in__gte=date_from)
    if date_to:
        qs = qs.filter(check_in__lte=date_to)
    return qs


def report_summary(user, date_from=None, date_to=None):
    qs = report_queryset(user, date_from, date_to)
    agg = lambda **kw: dict(bookings=Count("id"), tourists=Sum("guests"), revenue=Sum("total_price"), **kw)  # noqa: E731
    totals = qs.aggregate(bookings=Count("id"), tourists=Sum("guests"), projected_revenue=Sum("total_price"))
    by_month = (
        qs.annotate(month=TruncMonth("check_in")).values("month").annotate(**agg()).order_by("month")
    )
    by_listing = (
        qs.values("listing_id", "listing__title").annotate(**agg()).order_by("-revenue", "listing_id")
    )
    return {
        "totals": {
            "bookings": totals["bookings"] or 0,
            "tourists": totals["tourists"] or 0,
            "projected_revenue": _money(totals["projected_revenue"]),
        },
        "by_month": [
            {"month": r["month"].strftime("%Y-%m"), "bookings": r["bookings"], "tourists": r["tourists"] or 0,
             "revenue": _money(r["revenue"])} for r in by_month
        ],
        "by_listing": [
            {"listing_id": r["listing_id"], "title": r["listing__title"], "bookings": r["bookings"],
             "tourists": r["tourists"] or 0, "revenue": _money(r["revenue"])} for r in by_listing
        ],
    }
