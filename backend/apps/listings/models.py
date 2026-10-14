from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from shared.models import TimeStampedModel


class Category(models.TextChoices):
    LODGING = "lodging", "Alojamiento"
    PACKAGE = "package", "Paquete turístico"
    GUIDE = "guide", "Guía turístico"
    ACTIVITY = "activity", "Actividad/Tour"


class BookingMode(models.TextChoices):
    EXCLUSIVE = "exclusive", "Exclusiva (una reserva por fecha)"
    SHARED = "shared", "Compartida (cupos por fecha)"


class Difficulty(models.TextChoices):
    EASY = "easy", "Fácil"
    MEDIUM = "medium", "Media"
    HARD = "hard", "Alta"


class Listing(TimeStampedModel):
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listings")
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.LODGING, db_index=True)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    city = models.CharField(max_length=100)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(validators=[MinValueValidator(-90), MaxValueValidator(90)])
    longitude = models.FloatField(validators=[MinValueValidator(-180), MaxValueValidator(180)])
    # Precio por noche/día/persona-día según categoría y modo; el backend no distingue unidades.
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    max_guests = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    booking_mode = models.CharField(max_length=10, choices=BookingMode.choices, default=BookingMode.EXCLUSIVE)
    # Ficha técnica (F-31)
    duration_hours = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, blank=True)
    dress_code = models.CharField(max_length=255, blank=True)
    wellness_benefits = models.TextField(blank=True)
    image = models.ImageField(upload_to="listings/%Y/%m/", blank=True)
    photo_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["latitude", "longitude"], name="listing_latlng_idx")]
        constraints = [
            models.CheckConstraint(condition=models.Q(price_per_night__gt=0), name="listing_price_gt_0"),
            models.CheckConstraint(condition=models.Q(max_guests__gte=1), name="listing_capacity_gte_1"),
            models.CheckConstraint(
                condition=models.Q(latitude__gte=-90, latitude__lte=90, longitude__gte=-180, longitude__lte=180),
                name="listing_coords_range",
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"
