#!/bin/sh
# =============================================================================
# Script de arranque del contenedor:
#   1. Espera a que la base de datos acepte conexiones.
#   2. Aplica migraciones (RUN_MIGRATIONS=true).
#   3. Recolecta estáticos (RUN_COLLECTSTATIC=true).
#   4. Crea un superusuario si se definieron DJANGO_SUPERUSER_* (idempotente).
#   5. Ejecuta el comando final (gunicorn por defecto).
# =============================================================================
set -eu

echo "[entrypoint] Esperando a la base de datos..."
python - <<'PY'
import os, sys, time

import django

django.setup()
from django.db import connections
from django.db.utils import OperationalError

for intento in range(1, 31):
    try:
        connections["default"].ensure_connection()
        print(f"[entrypoint] Base de datos lista (intento {intento}).")
        sys.exit(0)
    except OperationalError as exc:
        print(f"[entrypoint] Base de datos no disponible ({intento}/30): {exc}")
        time.sleep(2)
print("[entrypoint] No fue posible conectar con la base de datos.", file=sys.stderr)
sys.exit(1)
PY

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Aplicando migraciones..."
  python manage.py migrate --noinput
fi

if [ "${RUN_COLLECTSTATIC:-true}" = "true" ]; then
  echo "[entrypoint] Recolectando archivos estáticos..."
  python manage.py collectstatic --noinput
fi

if [ -n "${DJANGO_SUPERUSER_USERNAME:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ] && [ -n "${DJANGO_SUPERUSER_EMAIL:-}" ]; then
  echo "[entrypoint] Verificando superusuario '${DJANGO_SUPERUSER_USERNAME}'..."
  python manage.py createsuperuser --noinput >/dev/null 2>&1 \
    && echo "[entrypoint] Superusuario creado." \
    || echo "[entrypoint] El superusuario ya existía; se omite."
fi

echo "[entrypoint] Iniciando: $*"
exec "$@"
