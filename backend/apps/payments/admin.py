from django.contrib import admin

from apps.bookings.admin import BookingAdmin
from shared.admin_utils import export_csv_action

from .models import Payment


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    can_delete = False
    readonly_fields = ("amount", "platform_fee", "host_payout", "status", "method", "gateway_reference")


BookingAdmin.inlines = [PaymentInline]  # el pago se ve dentro de la reserva


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "amount", "platform_fee", "host_payout", "status", "method", "created_at")
    list_filter = ("status", "method")
    search_fields = ("booking__id", "gateway_reference", "booking__guest__username")
    date_hierarchy = "created_at"
    raw_id_fields = ("booking",)
    actions = [export_csv_action(["id", "booking", "amount", "platform_fee", "host_payout", "status", "method"])]
