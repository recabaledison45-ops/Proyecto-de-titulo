#!/usr/bin/env bash
# Restaura la base de datos desde un respaldo .dump (local o s3://bucket/db/archivo.dump).
#   ./restore.sh /var/backups/wexperiencias/db-20261014-031500.dump
#   ./restore.sh s3://mi-bucket/db/db-20261014-031500.dump
#   TARGET_DB=wexp_prueba ./restore.sh <archivo>   # ensayo: restaura en otra base sin tocar la real
# Restaurar la base real SOBRESCRIBE los datos actuales: pide confirmación escribiendo el nombre de la base.
source "$(dirname "$0")/_common.sh"

SRC="${1:?Uso: restore.sh <archivo.dump | s3://bucket/db/archivo.dump>}"
DB_NAME="${POSTGRES_DB:-wexperiencias}"
DB_USER="${POSTGRES_USER:-wexp}"
TARGET_DB="${TARGET_DB:-$DB_NAME}"

if [[ "$SRC" == s3://* ]]; then
  FILE="$(mktemp --suffix=.dump)"
  trap 'rm -f "$FILE"' EXIT
  aws s3 cp "$SRC" "$FILE" --only-show-errors
else
  FILE="$SRC"
fi
[ -s "$FILE" ] || { echo "Archivo vacío o inexistente: $FILE" >&2; exit 1; }
compose exec -T db pg_restore --list < "$FILE" > /dev/null || { echo "El archivo no es un respaldo válido" >&2; exit 1; }

if [ "$TARGET_DB" = "$DB_NAME" ]; then
  echo "ATENCIÓN: se reemplazarán TODOS los datos de la base '$DB_NAME' con el respaldo $(basename "$FILE")."
  if [ "${ASSUME_YES:-0}" != "1" ]; then
    read -r -p "Escriba el nombre de la base para confirmar ($DB_NAME): " answer
    [ "$answer" = "$DB_NAME" ] || { echo "Cancelado."; exit 1; }
  fi
  log "Deteniendo el backend (Nginx mostrará error 502 mientras tanto)..."
  compose stop web
else
  log "Ensayo: restaurando en la base '$TARGET_DB' (la base real no se toca)."
  compose exec -T db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$TARGET_DB\"" -c "CREATE DATABASE \"$TARGET_DB\""
fi

log "Restaurando..."
compose exec -T db pg_restore -U "$DB_USER" -d "$TARGET_DB" --clean --if-exists --no-owner --exit-on-error < "$FILE"

if [ "$TARGET_DB" = "$DB_NAME" ]; then
  log "Levantando el backend..."
  compose up -d web
else
  log "Verificación rápida (cantidad de reservas y ofertas en '$TARGET_DB'):"
  compose exec -T db psql -U "$DB_USER" -d "$TARGET_DB" -tA \
    -c "select 'reservas', count(*) from bookings_booking union all select 'ofertas', count(*) from listings_listing" || true
  log "Para borrar el ensayo: docker compose exec db psql -U $DB_USER -d postgres -c 'DROP DATABASE \"$TARGET_DB\"'"
fi
log "Restauración terminada."
