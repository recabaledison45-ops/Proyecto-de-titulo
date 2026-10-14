from django.contrib import admin

from shared.admin_utils import export_csv_action

from . import services
from .models import Booking


@admin.action(description="Cancelar las reservas seleccionadas (libera fechas y reembolsa si estaban pagadas)")
def cancel_selected(modeladmin, request, queryset):
    done = 0
    for booking in queryset:
        try:
            services.cancel_booking(booking=booking, actor=request.user, reason="Cancelada por administración")
            done += 1
        except Exception as exc:  # noqa: BLE001
            modeladmin.message_user(request, f"Reserva #{booking.pk}: {exc}", level="warning")
    modeladmin.message_user(request, f"{done} reserva(s) cancelada(s).")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "listing", "guest", "check_in", "check_out", "guests", "total_price", "status", "expires_at")
    list_filter = ("status", "listing__category", "check_in")
    search_fields = ("listing__title", "guest__username", "guest__email")
    date_hierarchy = "check_in"
    list_select_related = ("listing", "guest")
    raw_id_fields = ("listing", "guest")
    actions = [cancel_selected, export_csv_action(["id", "listing", "guest", "check_in", "check_out", "guests", "total_price", "status"])]
    # El inline de pago lo agrega payments.admin (bookings no importa payments).
