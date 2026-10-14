from django.contrib import admin

from shared.admin_utils import export_csv_action

from .models import Listing


@admin.action(description="Dar de baja (desactivar) las ofertas seleccionadas")
def deactivate(modeladmin, request, queryset):
    queryset.update(is_active=False)


@admin.action(description="Reactivar las ofertas seleccionadas")
def activate(modeladmin, request, queryset):
    queryset.update(is_active=True)


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "host", "city", "price_per_night", "max_guests", "booking_mode", "is_active", "created_at")
    list_filter = ("category", "booking_mode", "is_active", "difficulty", "city")
    search_fields = ("title", "description", "city", "host__username")
    date_hierarchy = "created_at"
    list_select_related = ("host",)
    raw_id_fields = ("host",)
    actions = [deactivate, activate, export_csv_action(["id", "title", "category", "city", "price_per_night", "max_guests", "is_active"])]
