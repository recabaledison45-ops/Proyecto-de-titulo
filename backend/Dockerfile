# syntax=docker/dockerfile:1.7
# =============================================================================
# Imagen de producción del backend (multi-stage).
#   Etapa 1 (builder): compila las ruedas (wheels) de las dependencias.
#   Etapa 2 (runtime): imagen mínima, sin compiladores, usuario sin privilegios.
# =============================================================================

# ---------- Etapa 1: builder ----------
FROM python:3.14-slim AS builder

ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /build

COPY requirements.txt .
RUN pip wheel --wheel-dir /wheels -r requirements.txt

# ---------- Etapa 2: runtime ----------
FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production \
    PORT=8000

# Usuario sin privilegios
RUN groupadd --system --gid 1000 app \
 && useradd --system --uid 1000 --gid app --home-dir /app --shell /usr/sbin/nologin app

WORKDIR /app

# Instala dependencias desde las ruedas ya compiladas (sin acceso a red ni compiladores)
COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-index --find-links=/wheels -r requirements.txt && rm -rf /wheels

# Código de la aplicación
COPY --chown=app:app . .

# Carpetas de escritura: estáticos recolectados e imágenes subidas (volumen)
RUN mkdir -p /app/staticfiles /app/media \
 && chown -R app:app /app/staticfiles /app/media \
 && chmod +x /app/entrypoint.sh

USER app
EXPOSE 8000
VOLUME ["/app/media"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import os,urllib.request as u; u.urlopen('http://127.0.0.1:%s/api/v1/health/' % os.environ.get('PORT','8000'), timeout=4)" || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "-c", "exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-3} --timeout ${GUNICORN_TIMEOUT:-60} --access-logfile - --error-logfile -"]
