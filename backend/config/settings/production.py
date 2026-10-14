from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403
from .base import env, env_bool, env_list

DEBUG = False

if SECRET_KEY.startswith("dev-insecure-key"):  # noqa: F405
    raise ImproperlyConfigured("Defina SECRET_KEY en el entorno de producción.")
if not env("ALLOWED_HOSTS"):
    raise ImproperlyConfigured("Defina ALLOWED_HOSTS en el entorno de producción.")
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS")

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

EMAIL_BACKEND = env("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
REVIEW_REQUIRE_CHECKOUT_PASSED = env_bool("REVIEW_REQUIRE_CHECKOUT_PASSED", True)
