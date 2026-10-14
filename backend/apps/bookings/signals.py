from django.dispatch import Signal

# Se emite al cancelar o rechazar una reserva. `payments` la escucha: bookings no importa payments.
booking_cancelled = Signal()
