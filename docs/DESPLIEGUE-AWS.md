# Despliegue en AWS (F-21)

Arquitectura de producción: **una instancia EC2** con Docker Compose (Nginx → Django/gunicorn → PostgreSQL), TLS con
Let's Encrypt, respaldos diarios a S3 y monitoreo con CloudWatch. Es la arquitectura "VPS + Docker + Nginx" del informe,
alojada en AWS. Render + Vercel (ver `DESPLIEGUE.md`) quedan como **entorno de demostración/pruebas** gratuito.

```
Internet ──► Elastic IP ──► [ EC2 t3.small · Amazon Linux 2023 ]
                               │  Nginx :80/:443  (TLS, SPA React, proxy, límites, cabeceras de seguridad)
                               │     ├── /api, /admin, /static ─► web (gunicorn + Django) :8000 (red interna)
                               │     └── /media ─► volumen de imágenes (solo lectura)
                               │  db (PostgreSQL 16, volumen persistente, sin puertos publicados)
                               │  certbot (renovación automática del certificado)
                               ├──► S3: respaldos diarios (cifrados, versionados, expiran a los 90 días)
                               └──► CloudWatch: métricas, registros y alarmas ─► SNS ─► correo
```

Qué crea `infra/aws/wexperiencias.yml` (CloudFormation): instancia (IMDSv2, disco cifrado, protegida contra borrado
accidental), IP elástica, grupo de seguridad con **solo 80 y 443** (sin SSH: se administra por Session Manager), bucket S3
de respaldos, rol de la instancia con mínimos permisos, 7 alarmas con aviso por correo y un rol OIDC para que GitHub
Actions despliegue **sin guardar claves de AWS**.

## Requisitos
- Cuenta AWS y AWS CLI configurada (o usar la consola de CloudFormation).
- Un dominio propio (ej. `wexperiencias.cl`) cuyo DNS pueda editar.
- Para conectarse al servidor: [plugin Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).

## Paso a paso

### 1. Crear la infraestructura (≈ 10 min)
```bash
aws cloudformation deploy \
  --stack-name wexperiencias \
  --template-file infra/aws/wexperiencias.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
      Domain=wexperiencias.cl \
      LetsEncryptEmail=admin@wexperiencias.cl \
      AlertEmail=alertas@wexperiencias.cl \
      VpcId=vpc-xxxxxxxx SubnetId=subnet-xxxxxxxx
# Si su cuenta ya tiene el proveedor OIDC de GitHub, agregue: CreateGitHubOidcProvider=false
aws cloudformation describe-stacks --stack-name wexperiencias --query "Stacks[0].Outputs" --output table
```
`SubnetId` debe ser una subred **pública** (con ruta a un Internet Gateway). Confirme el correo de suscripción de SNS que
le llega: sin eso no recibirá alarmas.

### 2. Apuntar el DNS
Cree un registro **A** de `wexperiencias.cl` con el valor de la salida `ElasticIP`. Espere a que propague
(`nslookup wexperiencias.cl`).

### 3. Emitir el certificado TLS y levantar el sitio
```bash
aws ssm start-session --target <InstanceId>        # salida OpenShell del stack
sudo -i
cd /opt/wexperiencias/deploy
tail -n 3 /var/log/wexperiencias-bootstrap.log     # debe decir "Preparacion terminada"
STAGING=1 ./scripts/init-letsencrypt.sh            # ensayo contra Let's Encrypt de pruebas (recomendado la primera vez)
FORCE=1 ./scripts/init-letsencrypt.sh              # certificado real
./scripts/install-cron.sh                          # respaldos, chequeo de salud y vencimiento de reservas
```
Abra `https://wexperiencias.cl`. El arranque del backend aplica las migraciones solo.

### 4. Crear el administrador y completar la configuración
```bash
cd /opt/wexperiencias/deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml exec web python manage.py createsuperuser
nano .env.prod      # correo saliente (EMAIL_*), clave del proveedor de mapas (VITE_TILE_*), datos bancarios, etc.
./scripts/deploy.sh # aplica los cambios de .env.prod
```
`SEED_DEMO=false` y `ENABLE_API_DOCS=false` ya vienen así: **no** se cargan usuarios demo en producción.

### 5. Probar un respaldo y una restauración (obligatorio antes de entregar)
```bash
./scripts/backup.sh
TARGET_DB=wexp_prueba ./scripts/restore.sh /var/backups/wexperiencias/db-<fecha>.dump   # ensayo sin tocar la base real
aws s3 ls s3://<BackupBucketName>/db/
```

### 6. Despliegues automáticos desde GitHub (opcional, recomendado)
En GitHub → *Settings → Environments → New environment* `production` (active *Required reviewers* para exigir aprobación).
Dentro agregue:
| Tipo | Nombre | Valor |
|---|---|---|
| Secreto | `AWS_DEPLOY_ROLE_ARN` | salida `DeployRoleArn` |
| Variable | `AWS_REGION` | región del stack (ej. `us-east-1`) |
| Variable | `AWS_INSTANCE_ID` | salida `InstanceId` |
| Variable | `SITE_DOMAIN` | `wexperiencias.cl` |

Desde entonces: publicar una etiqueta (`git tag v1.0.0 && git push --tags`) o ejecutar *Actions → Desplegar a AWS* corre las
pruebas, pide aprobación, respalda la base, reconstruye y verifica `https://<dominio>/api/v1/health/`.

## Operación diaria
| Tarea | Cómo |
|---|---|
| Actualizar a la última versión | `cd /opt/wexperiencias/deploy && REF=main ./scripts/deploy.sh` |
| Ver registros | `docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f --tail 100 web nginx` |
| Estado | `docker compose --env-file .env.prod -f docker-compose.prod.yml ps` |
| Respaldos | automáticos 03:15 UTC; `/var/log/wexperiencias/backup.log` |
| Procedimientos ante fallas | [RUNBOOKS.md](RUNBOOKS.md) |

## Seguridad incluida
Sin SSH (solo SSM) · IMDSv2 con salto 1 (los contenedores no leen credenciales de la instancia) · disco y bucket cifrados ·
bucket sin acceso público, solo TLS y versionado · TLS 1.2/1.3 + HSTS · CSP y demás cabeceras en Nginx · límite de peticiones
en Nginx **y** en Django con IP real del cliente (`NUM_PROXIES=1`) · PostgreSQL y gunicorn sin puertos expuestos ·
contenedor del backend sin privilegios · secretos generados al azar y solo en `/opt/wexperiencias/deploy/.env.prod` (600).

## Costo orientativo (región us-east-1, 24×7)
t3.small ≈ US$ 15/mes · disco 30 GB ≈ US$ 2,4 · IP elástica pública ≈ US$ 3,7 · S3 y CloudWatch ≈ US$ 1–3 → **≈ US$ 22–25 al mes**
(+ dominio). Verifique precios vigentes en la calculadora de AWS: varían por región y cambian.

## Alternativa gestionada (si crece)
Mover PostgreSQL a **RDS** (cambiar `DATABASE_URL` y quitar `db` del compose), y el frontend a S3 + CloudFront. La
aplicación no requiere cambios de código: toda la configuración es por variables de entorno.

## Limitaciones conocidas
- Es **una sola instancia**: un fallo de zona de disponibilidad implica caída hasta restaurar (RTO ≈ 1 h, RPO ≤ 24 h con el
  respaldo diario). Para alta disponibilidad se necesita ALB + 2 instancias + RDS Multi-AZ (fuera del alcance del MVP).
- El throttling de Django usa memoria por proceso (3 workers): el límite efectivo es ~3× el configurado. Nginx aplica además
  su propio límite por IP.
- **Qué se validó y qué no** (14-oct-2026): la plantilla con `cfn-lint`, los scripts con `shellcheck`, los workflows con `actionlint`, el
  `docker-compose.prod.yml` con `docker compose config`, y la configuración de Nginx con un Nginx real y un backend de prueba (redirección
  HTTP→HTTPS, cabeceras de seguridad sin duplicados, SPA, caché, `/media`, la IP real del cliente aunque se falsifique `X-Forwarded-For`, y
  límite 429 en login). **No se pudo probar** en el entorno de desarrollo: construir las imágenes Docker, la emisión real de certificados ni la
  plantilla en una cuenta AWS (no hay demonio Docker ni acceso a AWS). El CI construye las imágenes y valida Nginx dentro de ellas en cada cambio;
  haga el ensayo con `STAGING=1` y una instancia nueva antes de la entrega.
