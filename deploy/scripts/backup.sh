#!/usr/bin/env bash
# Respaldo de PostgreSQL (formato custom, restaurable con pg_restore) y de las imágenes subidas (/media).
# Lo ejecuta cron a diario (ver install-cron.sh) y deploy.sh antes de cada despliegue.
# Con BACKUP_S3_BUCKET definido, copia los archivos a S3 (cifrado) y publica la métrica BackupSuccess.
source "$(dirname "$0")/_common.sh"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
MEDIA_FILE="$BACKUP_DIR/media-$STAMP.tar.gz"

fail() { log "ERROR: $*"; put_metric BackupSuccess 0; exit 1; }
trap 'fail "falló en la línea $LINENO"' ERR

log "Respaldando la base de datos..."
compose exec -T db pg_dump -U "${POSTGRES_USER:-wexp}" -d "${POSTGRES_DB:-wexperiencias}" --format=custom --no-owner > "$DB_FILE"
# Verifica que el archivo sea legible (no vacío y con tabla de contenido válida)
compose exec -T db pg_restore --list < "$DB_FILE" > /dev/null || fail "el respaldo de la base no es válido"
[ "$(stat -c %s "$DB_FILE")" -gt 1024 ] || fail "el respaldo de la base es sospechosamente pequeño"

log "Respaldando imágenes subidas..."
compose exec -T web tar czf - -C /app/media . > "$MEDIA_FILE"
tar tzf "$MEDIA_FILE" > /dev/null || fail "el respaldo de /media no es válido"

if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  command -v aws >/dev/null 2>&1 || fail "BACKUP_S3_BUCKET definido pero falta AWS CLI"
  log "Subiendo a s3://$BACKUP_S3_BUCKET ..."
  aws s3 cp "$DB_FILE" "s3://$BACKUP_S3_BUCKET/db/$(basename "$DB_FILE")" --sse AES256 --only-show-errors
  aws s3 cp "$MEDIA_FILE" "s3://$BACKUP_S3_BUCKET/media/$(basename "$MEDIA_FILE")" --sse AES256 --only-show-errors
else
  log "BACKUP_S3_BUCKET vacío: el respaldo queda solo en este servidor (NO es suficiente ante la pérdida del disco)."
fi

# Rotación local
find "$BACKUP_DIR" -type f \( -name 'db-*.dump' -o -name 'media-*.tar.gz' \) -mtime +"${BACKUP_KEEP_DAYS:-7}" -delete

trap - ERR
put_metric BackupSuccess 1
log "Respaldo completo: $(basename "$DB_FILE") ($(du -h "$DB_FILE" | cut -f1)), $(basename "$MEDIA_FILE") ($(du -h "$MEDIA_FILE" | cut -f1))"
