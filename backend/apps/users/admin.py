from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from shared.admin_utils import export_csv_action

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "display_name", "is_staff", "is_active", "date_joined")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("username", "email", "display_name", "phone")
    date_hierarchy = "date_joined"
    ordering = ("-date_joined",)
    actions = [export_csv_action(["username", "email", "role", "display_name", "phone", "date_joined"])]
    fieldsets = UserAdmin.fieldsets + (("Plataforma", {"fields": ("role", "display_name", "bio", "phone", "bank_details")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Plataforma", {"fields": ("email", "role")}),)
