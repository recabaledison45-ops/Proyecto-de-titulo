from shared.csv_utils import csv_response


def export_csv_action(fields):
    """Acción de admin que exporta la selección a CSV (con escape de fórmulas)."""

    def export_csv(modeladmin, request, queryset):
        rows = [[str(getattr(obj, f, "")) for f in fields] for obj in queryset]
        return csv_response(f"{modeladmin.model._meta.model_name}.csv", fields, rows)

    export_csv.short_description = "Exportar selección a CSV"
    export_csv.__name__ = "export_csv"
    return export_csv
