"""Producción: falla de inmediato si falta una variable crítica y activa las protecciones HTTPS."""
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403
from .base import ENABLE_API_DOCS, SECRET_KEY, env, env_bool, env_list

DEBUG = False  # nunca configurable en producción

# --- Variables obligatorias -----------------------------------------------------
if SECRET_KEY.startswith("dev-insecure-key") or len(SECRET_KEY) < 32:
    raise ImproperlyConfigured("Defina SECRET_KEY (mínimo 32 caracteres) en el entorno de producción.")
if not env("ALLOWED_HOSTS"):
    raise ImproperlyConfigured("Defina ALLOWED_HOSTS en el entorno de producción.")
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS")
if "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS no puede contener '*' en producción.")

# --- CORS estricto: solo orígenes explícitos, sin comodines ------------------------
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured("Defina CORS_ALLOWED_ORIGINS (dominios del frontend) en producción.")
if any(o == "*" or o.startswith("http://localhost") or o.startswith("http://127.") for o in CORS_ALLOWED_ORIGINS):
    raise ImproperlyConfigured("CORS_ALLOWED_ORIGINS no puede ser '*' ni apuntar a localhost en producción.")
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = False  # la API usa JWT por cabecera, no cookies

# --- HTTPS y cookies ----------------------------------------------------------------
# Detrás de un proxy TLS (Nginx, Railway, Render) el proxy envía X-Forwarded-Proto.
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SECURE_REDIRECT_EXEMPT = [r"^api/v1/health/$"]  # el chequeo de salud del orquestador va por HTTP interno
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = SECURE_SSL_REDIRECT
CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT
SECURE_HSTS_SECONDS = 31536000 if SECURE_SSL_REDIRECT else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_SSL_REDIRECT
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# --- Estáticos: WhiteNoise con compresión y nombres con hash ----------------------------
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# --- Correo y reglas ----------------------------------------------------------------------
EMAIL_BACKEND = env("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
REVIEW_REQUIRE_CHECKOUT_PASSED = env_bool("REVIEW_REQUIRE_CHECKOUT_PASSED", True)
