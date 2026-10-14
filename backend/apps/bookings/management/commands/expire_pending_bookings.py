from django.core.management.base import BaseCommand

from apps.bookings.services import expire_pending_bookings


class Command(BaseCommand):
    help = "Cancela las reservas pendientes sin pago que superaron su vencimiento (ejecutar por cron)."

    def handle(self, *args, **options):
        count = expire_pending_bookings()
        self.stdout.write(self.style.SUCCESS(f"{count} reserva(s) expirada(s)."))
