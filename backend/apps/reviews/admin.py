from django.contrib import admin

from shared.admin_utils import export_csv_action

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "author", "author_role", "rating", "is_published", "created_at")
    list_filter = ("author_role", "is_published", "rating")
    search_fields = ("author__username", "comment", "booking__listing__title")
    date_hierarchy = "created_at"
    raw_id_fields = ("booking", "author")
    actions = [export_csv_action(["id", "booking", "author", "author_role", "rating", "is_published"])]
