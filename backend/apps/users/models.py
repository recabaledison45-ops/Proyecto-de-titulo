from django.contrib.auth.models import AbstractUser
from django.db import models

from shared.models import TimeStampedModel


class User(TimeStampedModel, AbstractUser):
    class Role(models.TextChoices):
        GUEST = "guest", "Huésped"
        HOST = "host", "Anfitrión"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.GUEST)
    display_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    bank_details = models.TextField(blank=True, help_text="Datos para recibir transferencias (solo anfitriones).")

    @property
    def public_name(self):
        return self.display_name or self.username

    def __str__(self):
        return self.username
