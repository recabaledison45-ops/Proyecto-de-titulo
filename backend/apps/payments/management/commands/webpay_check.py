"""Comprueba la conexión y las credenciales de Webpay Plus creando una transacción de prueba (no cobra nada).

    python manage.py webpay_check

Una transacción creada y nunca pagada caduca sola en Transbank. Útil después de configurar las credenciales
de producción y en el CI (contra el ambiente de integración).
"""
import uuid

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.payments.webpay import WebpayClient, WebpayError


class Command(BaseCommand):
    help = "Verifica que Webpay Plus responde con las credenciales configuradas."

    def handle(self, *args, **options):
        client = WebpayClient()
        self.stdout.write(f"Ambiente: {settings.WEBPAY_ENV} · host: {client.base_url} · comercio: {client.commerce_code}")
        try:
            created = client.create(
                buy_order=f"CHECK-{uuid.uuid4().hex[:10].upper()}", session_id="webpay-check", amount=1000,
                return_url="https://example.cl/webpay-check",
            )
            status = client.status(created["token"])
        except WebpayError as exc:
            raise CommandError(f"Webpay no respondió correctamente: {exc}") from exc
        self.stdout.write(self.style.SUCCESS(
            f"OK: transacción creada (formulario: {created['url']}, estado: {status.get('status', '?')}, monto: {status.get('amount', '?')})"
        ))
