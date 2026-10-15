#!/usr/bin/env bash
# Primera emisión del certificado TLS (Let's Encrypt) para el dominio de deploy/.env.prod.
# Requisitos: el registro DNS A del dominio ya apunta a esta instancia y los puertos 80/443 están abiertos.
# Uso:  STAGING=1 ./init-letsencrypt.sh   # prueba con el entorno de pruebas (sin límites de emisión)
#       ./init-letsencrypt.sh             # certificado real
source "$(dirname "$0")/_common.sh"

: "${DOMAIN:?}" "${LETSENCRYPT_EMAIL:?}"
STAGING="${STAGING:-0}"

# Un certificado real de certbot deja su archivo de renovación; el temporal no.
if compose run --rm --entrypoint "test -f /etc/letsencrypt/renewal/$DOMAIN.conf" certbot >/dev/null 2>&1; then
  if [ "${FORCE:-0}" != "1" ]; then
    log "Ya existe un certificado para $DOMAIN. Use FORCE=1 para reemitirlo."
    exit 0
  fi
fi

log "1/4 Creando un certificado temporal para que Nginx pueda arrancar..."
compose run --rm --entrypoint "sh -c 'mkdir -p /etc/letsencrypt/live/$DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 -subj /CN=localhost \
  -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem'" certbot

log "2/4 Levantando la base de datos, el backend y Nginx..."
compose up -d --build db web nginx

log "3/4 Retirando el certificado temporal y pidiendo el real a Let's Encrypt..."
compose run --rm --entrypoint "sh -c 'rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf'" certbot
STAGING_ARG=()
[ "$STAGING" = "1" ] && STAGING_ARG=(--staging) && log "(modo STAGING: el certificado no será válido para navegadores)"
compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email --rsa-key-size 4096 \
  "${STAGING_ARG[@]}"

log "4/4 Recargando Nginx y levantando la renovación automática..."
compose exec nginx nginx -s reload
compose up -d certbot
log "Listo: https://$DOMAIN"
