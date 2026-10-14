from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    name = "apps.payments"
    label = "payments"

    def ready(self):
        from . import signals  # noqa: F401  (conecta el receiver de booking_cancelled)
