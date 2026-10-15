# Runbooks operativos (F-65)

Atajo para todos los comandos (en el servidor, como root):
```bash
cd /opt/wexperiencias/deploy
alias dc='docker compose --env-file .env.prod -f docker-compose.prod.yml'
```
Acceso al servidor sin SSH: `aws ssm start-session --target <InstanceId>` (luego `sudo -i`).

| # | Situación | Alarma / síntoma |
|---|---|---|
| 1 | [El sitio no responde](#1-el-sitio-no-responde) | `wexperiencias-app-caida` |
| 2 | [Revertir un despliegue](#2-revertir-un-despliegue) | errores tras publicar |
| 3 | [Restaurar la base de datos](#3-restaurar-la-base-de-datos) | datos dañados o borrados |
| 4 | [Falla el respaldo](#4-falla-el-respaldo) | `wexperiencias-sin-respaldo` |
| 5 | [Certificado TLS por vencer](#5-certificado-tls-por-vencer-o-vencido) | navegador avisa "no seguro" |
| 6 | [Disco lleno](#6-disco-lleno) | `wexperiencias-disco-lleno` |
| 7 | [Memoria o CPU altas](#7-memoria-o-cpu-altas) | `...memoria-alta` / `...cpu-alta` |
| 8 | [Instancia caída](#8-instancia-caída) | `...fallo-de-instancia` |
| 9 | [Rotar secretos](#9-rotar-secretos) | filtración sospechada |
| 10 | [Crear/recuperar un administrador](#10-administradores) | pérdida de acceso |
| 11 | [Reservas pendientes no vencen](#11-reservas-pendientes-no-vencen) | reportes del anfitrión |
| 12 | [Muchos errores 429](#12-errores-429-demasiadas-peticiones) | usuarios bloqueados |

---
## 1. El sitio no responde
1. Estado: `dc ps`. Todos deben estar `running` (`web` y `db` además `healthy`).
2. Si falta alguno: `dc up -d` y luego `dc logs --tail 100 <servicio>`.
3. `web` reinicia en bucle → casi siempre variable faltante o migración fallida: `dc logs --tail 200 web`
   (producción **se niega a arrancar** si falta `SECRET_KEY`, `ALLOWED_HOSTS` o `CORS_ALLOWED_ORIGINS`).
4. `nginx` no arranca → `dc logs nginx`; si dice que falta el certificado ver el runbook 5.
5. Responde por HTTP pero no por HTTPS → certificado (runbook 5). Nada responde → runbook 8.
6. Verificación final: `curl -fsS https://<dominio>/api/v1/health/` devuelve `{"status":"ok"}`.

## 2. Revertir un despliegue
Cada despliegue hace un respaldo previo y se puede volver a la versión anterior:
```bash
cd /opt/wexperiencias && git log --oneline -n 5 && git describe --tags     # elegir la versión buena
REF=<etiqueta-o-commit-anterior> SKIP_BACKUP=1 ./deploy/scripts/deploy.sh
```
Si la versión mala **aplicó migraciones** que la anterior no entiende, además hay que restaurar la base del respaldo previo
(runbook 3) o escribir una migración de reversa; consulte `python manage.py showmigrations` antes de decidir.

## 3. Restaurar la base de datos
Respaldos: locales en `/var/backups/wexperiencias/` y en `s3://<bucket>/db/`.
```bash
ls -lt /var/backups/wexperiencias | head
./scripts/restore.sh /var/backups/wexperiencias/db-<fecha>.dump           # pide confirmar escribiendo el nombre de la base
./scripts/restore.sh s3://<bucket>/db/db-<fecha>.dump                      # desde S3
```
- **Ensayo** sin tocar la base real: `TARGET_DB=wexp_prueba ./scripts/restore.sh <archivo>` (repetir cada trimestre).
- Las imágenes: `aws s3 cp s3://<bucket>/media/media-<fecha>.tar.gz - | dc exec -T web tar xzf - -C /app/media`
- Después de restaurar, avisar a los usuarios que las acciones posteriores al respaldo (hasta 24 h) se perdieron.

## 4. Falla el respaldo
1. `tail -n 50 /var/log/wexperiencias/backup.log` (la causa queda escrita).
2. Causas frecuentes: contenedor `db` detenido (runbook 1), disco lleno (6), permisos IAM (`aws s3 ls s3://<bucket>` debe funcionar).
3. Ejecutar a mano `./scripts/backup.sh`; al terminar bien, la alarma vuelve a OK sola.

## 5. Certificado TLS por vencer o vencido
La renovación es automática (contenedor `certbot`, cada 12 h). Si falla:
```bash
dc logs --tail 50 certbot
dc run --rm --entrypoint certbot certbot renew --webroot -w /var/www/certbot     # forzar intento y ver el error
dc exec nginx nginx -s reload
```
Causas: el DNS ya no apunta a la IP, el puerto 80 cerrado en el grupo de seguridad, o límite de emisión de Let's Encrypt.
Reemisión completa: `FORCE=1 ./scripts/init-letsencrypt.sh`.

## 6. Disco lleno
```bash
df -h / ; docker system df
docker image prune -af --filter "until=72h"      # imágenes antiguas (la causa más común)
journalctl --vacuum-size=200M
du -sh /var/lib/docker/containers/*/*-json.log | sort -h | tail   # los registros rotan a 10 MB × 5 por contenedor
```
Si sigue alto: ampliar el volumen EBS (consola → Modify volume) y luego `sudo growpart /dev/nvme0n1 1 && sudo xfs_growfs /`.

## 7. Memoria o CPU altas
1. `docker stats --no-stream` identifica el contenedor.
2. Pico por la compilación del frontend durante un despliegue → normal; el swap de 2 GB lo cubre.
3. Sostenido: bajar `WEB_CONCURRENCY` en `.env.prod` (cada worker usa ~100–150 MB) o subir el tipo de instancia
   (detener → cambiar tipo → iniciar; la IP elástica se conserva).
4. Tráfico anómalo: `dc logs nginx | awk '{print $1}' | sort | uniq -c | sort -rn | head` y bloquear en el grupo de seguridad.

## 8. Instancia caída
- Si falla el chequeo **del sistema**, la alarma ejecuta la recuperación automática de EC2 (misma IP, mismo disco).
- Si falla el chequeo de la **instancia**: consola EC2 → *Reboot*. Los contenedores tienen `restart: unless-stopped` y
  vuelven solos; verifique con el runbook 1.
- Si el disco se perdió: crear la pila de nuevo (`infra/aws/`), asociar la IP, restaurar el último respaldo de S3 (runbook 3) y
  `init-letsencrypt.sh`. Tiempo estimado: 1 hora.

## 9. Rotar secretos
- **SECRET_KEY**: cambiarla invalida todas las sesiones (los usuarios deben ingresar de nuevo). Editar `.env.prod` → `./scripts/deploy.sh`.
- **Clave de PostgreSQL**: `dc exec db psql -U wexp -c "ALTER USER wexp PASSWORD 'nueva'"`, cambiar `POSTGRES_PASSWORD` en `.env.prod`,
  `dc up -d web`.
- **Clave del mapa (MapTiler)**: generar otra en su panel, actualizar `VITE_TILE_URL` y `./scripts/deploy.sh` (se incrusta al compilar).
- **Filtración de `.env.prod` o de un respaldo**: rotar las tres anteriores y las claves SMTP; revisar S3 (CloudTrail).

## 10. Administradores
```bash
dc exec web python manage.py createsuperuser
dc exec web python manage.py changepassword <usuario>
```
Los usuarios demo (`huesped`, `anfitrion`, `admin`, clave `demo1234`) **no deben existir** en producción:
`dc exec web python manage.py shell -c "from django.contrib.auth import get_user_model as g; g().objects.filter(username__in=['huesped','anfitrion','admin']).delete()"`
(solo si se cargaron por error; revise antes que no sean cuentas reales).

## 11. Reservas pendientes no vencen
El vencimiento (48 h) lo ejecuta cron cada hora. Revisar `/var/log/wexperiencias/expire.log` y `cat /etc/cron.d/wexperiencias`;
si falta, `./scripts/install-cron.sh`. Manual: `dc exec web python manage.py expire_pending_bookings`.

## 12. Errores 429 (demasiadas peticiones)
El límite protege la API (anónimos 300/min, usuarios 600/min, login 5/min, registro 10/min, por IP real). Si muchos usuarios
legítimos comparten IP (universidad, oficina), subir `THROTTLE_RATE_ANON` / `THROTTLE_RATE_USER` en `.env.prod` y
`./scripts/deploy.sh`. Si todos los usuarios aparecen con la misma IP, `NUM_PROXIES` está mal configurado (debe ser `1`).

---
## Contactos y datos de referencia (completar al entregar)
| Dato | Valor |
|---|---|
| Responsable técnico | |
| Cuenta / región AWS | |
| Dominio y proveedor DNS | |
| Correo de alertas | |
| Ubicación segura de `.env.prod` y del respaldo de claves | |
