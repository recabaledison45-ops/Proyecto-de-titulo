#!/usr/bin/env bash
# Utilidades comunes de los scripts de deploy/. Se incluye con:  source "$(dirname "$0")/_common.sh"
set -Eeuo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
export REPO_DIR
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env.prod}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/wexperiencias}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no existe $ENV_FILE (copie deploy/.env.prod.example y complételo)" >&2
  exit 1
fi

# Carga variables (DOMAIN, POSTGRES_*, BACKUP_S3_BUCKET...) sin exportar basura al entorno de los hijos.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

compose() {
  docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE" "$@"
}

log() { printf '%s [%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(basename "$0")" "$*"; }

# Publica una métrica en CloudWatch (si hay AWS CLI y permisos). Nunca hace fallar al script que la llama.
put_metric() {
  local name="$1" value="$2"
  command -v aws >/dev/null 2>&1 || return 0
  aws cloudwatch put-metric-data --namespace WExperiencias --metric-name "$name" --value "$value" \
    --dimensions "Host=${DOMAIN}" >/dev/null 2>&1 || log "aviso: no se pudo publicar la métrica $name"
}
