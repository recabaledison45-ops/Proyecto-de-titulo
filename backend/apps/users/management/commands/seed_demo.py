"""Datos de demostración (idempotente): usuarios, ofertas de las 4 categorías, reservas y reseñas."""
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.bookings.models import Booking
from apps.listings.models import Listing
from apps.payments.models import Payment
from apps.payments.services import calculate_split
from apps.reviews.models import Review
from apps.users.models import User

PASSWORD = "demo1234"


def photo(seed):
    return f"https://picsum.photos/seed/{seed}/900/600"


OFFERS = [
    dict(category="lodging", title="Cabaña frente al mar en Constitución", city="Constitución",
         address="Av. Costanera 120", latitude=-35.3330, longitude=-72.4150, price_per_night=65000, max_guests=5,
         description="Cabaña con vista a la desembocadura del Maule, terraza y tinaja. Ideal para desconectar.",
         wellness_benefits="Silencio, contacto con el mar y amaneceres frente al océano.", photo_url=photo("cabana-mar")),
    dict(category="lodging", title="Casona patrimonial en Talca", city="Talca", address="2 Norte 1180",
         latitude=-35.4264, longitude=-71.6554, price_per_night=48000, max_guests=6,
         description="Casona restaurada cerca del centro, con patio interior y desayuno incluido.",
         photo_url=photo("casona-talca")),
    dict(category="package", title="Escapada de bienestar: costa y dunas", city="Constitución", address="Plaza de Armas",
         latitude=-35.3340, longitude=-72.4120, price_per_night=89000, max_guests=8, duration_hours=8, difficulty="easy",
         description="Paquete de dos días con yoga frente al mar, caminata por las dunas y almuerzo con productores "
                     "locales (gastronomía típica y taller artesanal de aliados).",
         dress_code="Ropa cómoda en capas, zapatillas y protector solar",
         wellness_benefits="Yoga, respiración consciente, baño de bosque y alimentación local.", photo_url=photo("dunas")),
    dict(category="package", title="Ruta del vino y relajo en el Valle del Maule", city="San Javier",
         address="Camino a Maule Sur s/n", latitude=-35.5970, longitude=-71.7300, price_per_night=95000, max_guests=6,
         duration_hours=7, difficulty="easy", description="Cata de vinos patrimoniales, almuerzo campestre y masaje.",
         dress_code="Ropa casual", wellness_benefits="Terapia holística y desconexión.", photo_url=photo("vino-maule")),
    dict(category="guide", title="Guía local: Piedra de la Iglesia y río Maule", city="Constitución",
         address="Muelle de Constitución", latitude=-35.3347, longitude=-72.4172, price_per_night=40000, max_guests=6,
         duration_hours=4, difficulty="medium", description="Guía certificado, historia y naturaleza del río y la costa.",
         dress_code="Zapatillas y gorro", wellness_benefits="Contacto con la naturaleza y atención plena.",
         photo_url=photo("guia-maule")),
    dict(category="guide", title="Guía de aves en la Reserva Los Ruiles", city="Empedrado", address="Ruta M-80-N",
         latitude=-35.5990, longitude=-72.2750, price_per_night=35000, max_guests=4, duration_hours=3, difficulty="easy",
         description="Observación de aves y flora nativa con guía especializado.", photo_url=photo("ruiles")),
    dict(category="activity", title="Caminata regenerativa a Siete Tazas", city="Molina", address="Parque Inglés",
         latitude=-35.4640, longitude=-71.1100, price_per_night=28000, max_guests=12, booking_mode="shared",
         duration_hours=5, difficulty="medium",
         description="Tour grupal con cupos por fecha: caminata guiada y limpieza colaborativa del sendero.",
         dress_code="Ropa deportiva, zapatos de trekking, agua y snack",
         wellness_benefits="Ejercicio suave, baño de bosque y aporte al ecosistema.", photo_url=photo("siete-tazas")),
    dict(category="activity", title="Kayak al atardecer en la laguna de Vichuquén", city="Vichuquén", address="Playa Aquelarre",
         latitude=-34.8830, longitude=-72.0160, price_per_night=32000, max_guests=8, booking_mode="shared",
         duration_hours=2.5, difficulty="easy", description="Remada tranquila con equipo y guía incluidos.",
         dress_code="Ropa que pueda mojarse", photo_url=photo("kayak-vichuquen")),
    dict(category="activity", title="Taller de cerámica y té en Pelluhue", city="Pelluhue", address="Costanera s/n",
         latitude=-35.8330, longitude=-72.5700, price_per_night=22000, max_guests=10, duration_hours=3, difficulty="easy",
         description="Taller artesanal con emprendedoras locales y degustación de infusiones.",
         wellness_benefits="Creatividad y calma.", photo_url=photo("ceramica-pelluhue")),
]


class Command(BaseCommand):
    help = "Crea usuarios y ofertas de demostración (clave demo1234). Es idempotente."

    @transaction.atomic
    def handle(self, *args, **options):
        host = self._user("anfitrion", "host", display_name="W Experiencias",
                          bio="Experiencias de turismo regenerativo y de bienestar en la Región del Maule.",
                          bank_details="Banco Estado · Cuenta vista 12345678 · RUT 12.345.678-9 · pagos@wexperiencias.cl")
        guest = self._user("huesped", "guest", display_name="Huésped de prueba")
        self._user("admin", "host", is_staff=True, is_superuser=True)

        listings = {}
        for data in OFFERS:
            data = dict(data)
            listing, _ = Listing.objects.get_or_create(host=host, title=data.pop("title"), defaults=data)
            listings[listing.title] = listing

        if not Booking.objects.filter(guest=guest).exists():
            self._sample_bookings(host, guest, list(listings.values()))
        self.stdout.write(self.style.SUCCESS(
            f"Datos demo listos: {len(listings)} ofertas. Usuarios anfitrion / huesped / admin (clave {PASSWORD})."))

    def _user(self, username, role, **extra):
        user, created = User.objects.get_or_create(username=username, defaults=dict(
            role=role, email=f"{username}@example.com", **extra))
        if created:
            user.set_password(PASSWORD)
            user.save()
        return user

    def _sample_bookings(self, host, guest, listings):
        today = timezone.localdate()
        past = Booking.objects.create(
            listing=listings[0], guest=guest, check_in=today - timedelta(days=20), check_out=today - timedelta(days=17),
            guests=2, total_price=Decimal(listings[0].price_per_night) * 3, status=Booking.Status.COMPLETED)
        fee, payout = calculate_split(past.total_price)
        Payment.objects.create(booking=past, amount=past.total_price, platform_fee=fee, host_payout=payout,
                               status=Payment.Status.SUCCEEDED, method=Payment.Method.BANK_TRANSFER,
                               gateway_reference=f"WEXP-{past.pk}", confirmed_at=timezone.now())
        Review.objects.create(booking=past, author=guest, author_role="guest", rating=5, is_published=True,
                              comment="Un lugar precioso y muy tranquilo. La atención fue excelente.")
        Review.objects.create(booking=past, author=host, author_role="host", rating=5, is_published=True,
                              comment="Huéspedes puntuales y muy respetuosos.")
        Booking.objects.create(
            listing=listings[2], guest=guest, check_in=today + timedelta(days=14), check_out=today + timedelta(days=16),
            guests=3, total_price=Decimal(listings[2].price_per_night) * 2, status=Booking.Status.PENDING,
            expires_at=timezone.now() + timedelta(hours=48))
