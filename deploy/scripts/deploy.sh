#!/usr/bin/env bash
# Despliega la versión de código que esté descargada en este servidor.
#   ./deploy.sh                 # actualiza a la rama/etiqueta actual (ya hecha con git checkout)
#   REF=v1.2.0 ./deploy.sh      # descarga y despliega esa etiqueta o rama
#   SKIP_BACKUP=1 ./deploy.sh   # omite el respaldo previo (no recomendado)
# Si algo falla: ver docs/RUNBOOKS.md → "Revertir un despliegue".
source "$(dirname "$0")/_common.sh"

cd "$REPO_DIR" || exit 1
if [ -n "${REF:-}" ]; then
  [[ "$REF" =~ ^[A-Za-z0-9._/-]+$ ]] || { echo "REF inválida: $REF" >&2; exit 1; }
  log "Descargando $REF..."
  git fetch --tags --prune origin
  git checkout --quiet "$REF"
  # Si REF es una rama, avanzar a su último commit (en una etiqueta esto no aplica).
  git symbolic-ref -q HEAD >/dev/null && git pull --ff-only origin "$REF"
fi
log "Versión a desplegar: $(git describe --tags --always) ($(git rev-parse --short HEAD))"

if [ "${SKIP_BACKUP:-0}" != "1" ] && compose ps --status running --services 2>/dev/null | grep -qx db; then
  log "Respaldo previo al despliegue..."
  "$DEPLOY_DIR/scripts/backup.sh"
fi

log "Construyendo imágenes..."
compose build --pull
log "Levantando servicios (el backend aplica migraciones al iniciar)..."
compose up -d --remove-orphans

log "Esperando que el backend quede saludable..."
state=starting
for _ in $(seq 1 60); do
  state="$(docker inspect --format '{{.State.Health.Status}}' "$(compose ps -q web)" 2>/dev/null || echo starting)"
  [ "$state" = "healthy" ] && break
  sleep 5
done
if [ "$state" != "healthy" ]; then
  log "ERROR: el backend no quedó saludable (estado: $state). Últimos registros:"
  compose logs --tail 80 web
  exit 1
fi

if curl -fsS --max-time 15 "https://${DOMAIN}/api/v1/health/" >/dev/null; then
  log "Despliegue correcto: https://${DOMAIN}"
else
  log "AVISO: el backend está sano pero https://${DOMAIN}/api/v1/health/ no responde (¿DNS o certificado?)."
  exit 1
fi
docker image prune -f >/dev/null
