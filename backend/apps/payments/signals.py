from django.dispatch import receiver

from apps.bookings.signals import booking_cancelled

from . import services


@receiver(booking_cancelled)
def on_booking_cancelled(sender, booking, **kwargs):
    services.handle_booking_closed(booking)
