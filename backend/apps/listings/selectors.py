from datetime import date, timedelta

from django.db.models import Avg, Count, F, Q

from apps.bookings import selectors as booking_selectors

from .models import Listing

# NOTA (deuda técnica documentada): listings consulta a bookings para calcular disponibilidad.
# Se aísla en un único selector de bookings; ver README.

ORDERING = {
    "price_per_night": "price_per_night",
    "-price_per_night": "-price_per_night",
    "created_at": "created_at",
    "-created_at": "-created_at",
    "title": "title",
    "-title": "-title",
    "-rating": None,  # mejor valoradas primero (se resuelve en search_listings)
}


def annotated_listings():
    """Promedio y cantidad de reseñas publicadas del huésped sobre la oferta."""
    published = Q(bookings__reviews__is_published=True, bookings__reviews__author_role="guest")
    return Listing.objects.select_related("host").annotate(
        rating_avg=Avg("bookings__reviews__rating", filter=published),
        reviews_count=Count("bookings__reviews", filter=published, distinct=True),
    )


def search_listings(params, user):
    qs = annotated_listings()
    if params.get("mine"):
        qs = qs.filter(host=user)
    else:
        qs = qs.filter(is_active=True)

    for field, lookup in (("lat_min", "latitude__gte"), ("lat_max", "latitude__lte"),
                          ("lng_min", "longitude__gte"), ("lng_max", "longitude__lte")):
        if params.get(field) is not None:
            qs = qs.filter(**{lookup: params[field]})
    term = (params.get("q") or "").strip()
    if term:  # búsqueda libre por título, ciudad, dirección o descripción
        qs = qs.filter(Q(title__icontains=term) | Q(city__icontains=term) | Q(address__icontains=term)
                       | Q(description__icontains=term))
    if params.get("category"):
        qs = qs.filter(category=params["category"])
    if params.get("difficulty"):
        qs = qs.filter(difficulty=params["difficulty"])
    if params.get("max_duration_hours") is not None:
        qs = qs.filter(duration_hours__lte=params["max_duration_hours"])
    if params.get("guests"):
        qs = qs.filter(max_guests__gte=params["guests"])
    if params.get("check_in") and params.get("check_out"):
        blocked = booking_selectors.unavailable_listing_ids(
            params["check_in"], params["check_out"], params.get("guests") or 1
        )
        qs = qs.exclude(pk__in=blocked)

    key = params.get("ordering")
    if key == "-rating":
        return qs.order_by(F("rating_avg").desc(nulls_last=True), "-reviews_count", "-id")
    return qs.order_by(ORDERING.get(key) or "-created_at", "-id")


def get_listing(pk):
    return annotated_listings().filter(pk=pk).first()


def booked_dates(listing, days=366):
    """Fechas ocupadas desde hoy: [{date, taken}] con `taken` = personas reservadas esa noche."""
    from django.utils import timezone

    start = timezone.localdate()
    occupancy = booking_selectors.occupancy(listing, start, start + timedelta(days=days))
    return [{"date": d.isoformat(), "taken": taken} for d, taken in sorted(occupancy.items()) if isinstance(d, date)]
