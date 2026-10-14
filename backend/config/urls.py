from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as serve_media
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

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

# Documentación OpenAPI/Swagger (se puede apagar con ENABLE_API_DOCS=false)
if settings.DEBUG or settings.ENABLE_API_DOCS:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]

# Imágenes subidas en producción: preferible Nginx; con SERVE_MEDIA=true las sirve Django (Railway/Render + volumen).
if settings.SERVE_MEDIA and not settings.DEBUG:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve_media, {"document_root": settings.MEDIA_ROOT}),
    ]

# En producción las imágenes las sirve Nginx; en desarrollo, Django.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
