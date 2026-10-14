from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from shared.views import health

api_v1 = [
    path("health/", health, name="health"),
    path("", include("apps.users.urls")),
    path("", include("apps.listings.urls")),
    path("", include("apps.bookings.urls")),
    path("", include("apps.payments.urls")),
    path("", include("apps.reviews.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
]

# En producción las imágenes las sirve Nginx; en desarrollo, Django.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
