import csv

from django.http import HttpResponse

_DANGEROUS = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value):
    """Neutraliza fórmulas (CSV injection): las celdas de texto que parten con = + - @ se escapan."""
    if isinstance(value, str) and value.startswith(_DANGEROUS):
        return "'" + value
    return value


def csv_response(filename, header, rows):
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.write("\ufeff")  # BOM para que Excel lea UTF-8
    writer = csv.writer(response)
    writer.writerow(header)
    for row in rows:
        writer.writerow([safe_cell(c) for c in row])
    return response
