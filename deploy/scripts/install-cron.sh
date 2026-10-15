#!/usr/bin/env bash
# Instala las tareas programadas en /etc/cron.d/wexperiencias (ejecutar con sudo, una sola vez).
#   - respaldo diario (03:15 UTC) · chequeo de salud cada 5 min
#   - vencimiento de reservas pendientes (cada hora) · limpieza semanal de imágenes Docker
set -Eeuo pipefail
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR=/var/log/wexperiencias
mkdir -p "$LOG_DIR" /var/backups/wexperiencias

cat > /etc/cron.d/wexperiencias <<CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 3 * * *    root $DEPLOY_DIR/scripts/backup.sh      >> $LOG_DIR/backup.log 2>&1
*/5 * * * *   root $DEPLOY_DIR/scripts/healthcheck.sh >> $LOG_DIR/healthcheck.log 2>&1
0 * * * *     root docker compose -f $DEPLOY_DIR/docker-compose.prod.yml --env-file $DEPLOY_DIR/.env.prod exec -T web python manage.py expire_pending_bookings >> $LOG_DIR/expire.log 2>&1
30 4 * * 0    root docker image prune -af --filter "until=168h" >> $LOG_DIR/prune.log 2>&1
CRON
chmod 644 /etc/cron.d/wexperiencias

cat > /etc/logrotate.d/wexperiencias <<LOGROTATE
$LOG_DIR/*.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
}
LOGROTATE
echo "Tareas programadas instaladas en /etc/cron.d/wexperiencias"
