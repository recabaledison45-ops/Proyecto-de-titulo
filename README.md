# W Experiencias · MVP de reservas turísticas

[![CI](https://github.com/recabaledison45-ops/Proyecto-de-titulo/actions/workflows/ci.yml/badge.svg)](https://github.com/recabaledison45-ops/Proyecto-de-titulo/actions/workflows/ci.yml)
[![Seguridad](https://github.com/recabaledison45-ops/Proyecto-de-titulo/actions/workflows/security.yml/badge.svg)](https://github.com/recabaledison45-ops/Proyecto-de-titulo/actions/workflows/security.yml)

Marketplace bilateral para turismo regenerativo y de bienestar (Región del Maule): **alojamientos, paquetes turísticos,
guías locales y actividades/tours** bajo un mismo motor de búsqueda, reservas, pagos y reseñas.

- **Backend:** Django 5.2 + Django REST Framework, monolito modular, API 100 % JSON, auth JWT (`simplejwt`).
- **Frontend:** React 19 + Vite + React Router, Axios con renovación automática del token, Tailwind CSS v4 + componentes
  estilo shadcn/ui, mapa con Leaflet (sin clave en desarrollo; MapTiler en producción).
- **Base de datos:** SQLite por defecto; PostgreSQL con variables de entorno.
- **Contenedores y producción:** Docker (imagen multi-stage del backend y de Nginx + frontend), Docker Compose con PostgreSQL,
  Nginx con TLS (Let's Encrypt), respaldos a S3 y monitoreo con CloudWatch en **AWS (EC2)**.
- **Calidad:** GitHub Actions (CI/CD), 67 pruebas del backend, 26 pruebas E2E con Playwright (incluye accesibilidad con axe),
  carga con k6 y auditorías de seguridad (pip-audit, npm audit, OWASP ZAP).

```
backend/            # Django + DRF (ver detalle abajo)
├── manage.py · requirements.txt · .env.example
├── Dockerfile · docker-compose.yml · entrypoint.sh
├── config/settings/{base,local,production}.py · urls.py · wsgi.py · asgi.py
├── apps/
│   ├── users/      # registro, login JWT, roles huésped/anfitrión, perfil, seed_demo
│   ├── listings/   # ofertas (4 categorías), búsqueda por mapa/fechas/personas, fechas ocupadas
│   ├── bookings/   # reservas, máquina de estados, anti doble reserva, expiración, reportes
│   ├── payments/   # pasarelas intercambiables, comisión de plataforma, reembolso por señal
│   └── reviews/    # reseñas ciegas cruzadas
└── shared/         # TimeStampedModel, permisos, excepciones, correos, CSV, pruebas base
frontend/           # SPA (src/api, components, components/ui, context, hooks, lib, pages)
e2e/                # pruebas extremo a extremo (Playwright) + accesibilidad (axe) + SEO
loadtest/           # pruebas de carga (k6)
deploy/             # producción: docker-compose.prod.yml, Nginx (TLS), scripts de despliegue/respaldo/monitoreo
infra/aws/          # CloudFormation: EC2, IP elástica, S3, alarmas, rol de despliegue (OIDC)
docs/               # guías, runbooks, manual de usuario, plan UAT, decisiones
.github/workflows/  # ci.yml · security.yml · loadtest.yml · deploy.yml
render.yaml · DESPLIEGUE.md   # entorno de demostración gratuito (Render + Vercel)
```

Cada app separa `models.py`, `serializers.py`, `services.py` (escritura y reglas de negocio), `selectors.py` (lecturas),
`views.py` (delgadas), `urls.py` y `admin.py`.

## Documentación
| Documento | Contenido |
|---|---|
| [docs/DESPLIEGUE-AWS.md](docs/DESPLIEGUE-AWS.md) | Producción en AWS: Nginx, TLS, respaldos, monitoreo, despliegue automático |
| [docs/RUNBOOKS.md](docs/RUNBOOKS.md) | Qué hacer ante caídas, restauración, certificados, disco lleno, rotación de claves |
| [docs/MANUAL-DE-USUARIO.md](docs/MANUAL-DE-USUARIO.md) | Manual para huéspedes, anfitriones y administración |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) · [docs/PRUEBAS-CARGA.md](docs/PRUEBAS-CARGA.md) | Estrategia, conteo y resultados de pruebas; carga con k6 |
| [docs/SEGURIDAD.md](docs/SEGURIDAD.md) | pip-audit, npm audit, OWASP ZAP y controles implementados |
| [docs/ACCESIBILIDAD-SEO.md](docs/ACCESIBILIDAD-SEO.md) | WCAG 2.1 AA, lista de revisión manual y SEO |
| [docs/DECISION-TESELAS.md](docs/DECISION-TESELAS.md) | Proveedor del mapa y cómo configurarlo |
| [docs/UAT.md](docs/UAT.md) | Plan, casos y acta de aceptación con la clienta |
| [docs/AJUSTES-INFORME.md](docs/AJUSTES-INFORME.md) | Cambios a reflejar en el informe del proyecto de título |
| [DESPLIEGUE.md](DESPLIEGUE.md) | Entorno de demostración gratuito (Render + Vercel) |

## Cómo correrlo (dos terminales)

**Terminal 1 · backend** (Python 3.12)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo          # usuarios y ofertas de ejemplo
python manage.py runserver          # http://127.0.0.1:8000
```

**Terminal 2 · frontend** (Node 20+)
```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173
```

Usuarios demo (clave `demo1234`): **`anfitrion`** (publica y gestiona), **`huesped`** (reserva) y **`admin`**
(consola `http://127.0.0.1:8000/admin/`). Los correos se imprimen en la consola del backend.

## Interfaz (rediseño estilo Airbnb / Tripadvisor)
Rutas del frontend: `/` portada con buscador, categorías y secciones · `/explore` lista + mapa con filtros (la URL guarda los
filtros: `?q=&category=&dest=&check_in=&check_out=&guests=&difficulty=`) · `/listings/:id` detalle con reserva ·
`/favorites` favoritos (se guardan en el navegador) · `/bookings` mis reservas · `/account` panel de anfitrión.
El backend añade búsqueda de texto (`GET /api/v1/listings/?q=`) y `ordering=-rating` (mejor valoradas primero).

## Guía de ejecución paso a paso (backend)

### 1. Clonar y preparar el entorno
```bash
git clone https://github.com/recabaledison45-ops/Proyecto-de-titulo.git
cd Proyecto-de-titulo/backend
cp .env.example .env               # edite SECRET_KEY y lo que necesite (Windows: copy .env.example .env)
```
> Si en su carpeta local quedó un `.venv/` o `db.sqlite3` antiguos, bórrelos: están en `.gitignore` y no se versionan.

### 2A. Levantar **sin Docker** (desarrollo, SQLite)
```bash
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo                               # opcional: datos de ejemplo
python manage.py createsuperuser                         # para entrar a /admin/
python manage.py runserver                               # http://127.0.0.1:8000
```
Para usar PostgreSQL sin Docker, ponga en `.env`: `DATABASE_URL=postgres://usuario:clave@localhost:5432/wexperiencias`.

### 2B. Levantar **con Docker** (PostgreSQL + gunicorn)
```bash
cd backend
cp .env.example .env
# En .env defina como mínimo: SECRET_KEY (>= 32 caracteres), ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, POSTGRES_PASSWORD
# Para probar en tu PC sin HTTPS agrega además: SECURE_SSL_REDIRECT=false  y  ALLOWED_HOSTS=localhost,127.0.0.1
docker compose up -d --build
docker compose logs -f web                               # migra, recolecta estáticos y arranca gunicorn
docker compose exec web python manage.py createsuperuser
```
El contenedor ejecuta `entrypoint.sh`: espera a la base → `migrate` → `collectstatic` → (superusuario si define
`DJANGO_SUPERUSER_USERNAME/EMAIL/PASSWORD`) → `gunicorn`. Los datos persisten en los volúmenes `postgres_data` y `media_data`.
Detener: `docker compose down` (agregue `-v` solo si quiere borrar la base).

> **Producción es estricta a propósito:** se niega a arrancar si falta `SECRET_KEY` (≥ 32 caracteres), `ALLOWED_HOSTS`
> o `CORS_ALLOWED_ORIGINS`, o si alguno contiene `*` o localhost. Para probar el contenedor en su PC, ponga en
> `CORS_ALLOWED_ORIGINS` un dominio de ejemplo con https (p. ej. `https://app.ejemplo.cl`); para desarrollo del frontend use
> la opción 2A (settings `local`, que permite `http://localhost:5173`).

### 3. Probar los endpoints
**Swagger UI:** `http://127.0.0.1:8000/api/docs/` (esquema OpenAPI en `/api/schema/`). Siempre visible en local; en producción
actívelo con `ENABLE_API_DOCS=true`. Pulse **Authorize** y pegue el `access` token del login.

**cURL:**
```bash
B=http://127.0.0.1:8000/api/v1
curl $B/health/
curl -X POST $B/auth/register/ -H 'Content-Type: application/json' \
  -d '{"username":"anfi","email":"anfi@mail.cl","password":"Contr4sena-larga-9","role":"host"}'
TOKEN=$(curl -s -X POST $B/auth/login/ -H 'Content-Type: application/json' \
  -d '{"username":"anfi","password":"Contr4sena-larga-9"}' | python -c "import sys,json;print(json.load(sys.stdin)['access'])")
curl -X POST $B/listings/ -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Cata de vinos en Talca","category":"activity","city":"Talca","latitude":-35.43,"longitude":-71.66,"price_per_night":25000,"max_guests":8,"booking_mode":"shared"}'
curl "$B/listings/?category=activity"
```
**Postman:** *Import → Link* con `http://127.0.0.1:8000/api/schema/` y autorización *Bearer Token*.

### 4. Desplegar
- **Producción: AWS (EC2 + Docker + Nginx + TLS)** → guía completa en [docs/DESPLIEGUE-AWS.md](docs/DESPLIEGUE-AWS.md). Un solo comando de
  CloudFormation crea el servidor, la IP, el bucket de respaldos y las alarmas; `deploy/docker-compose.prod.yml` levanta Nginx,
  Django y PostgreSQL. Los despliegues posteriores salen de GitHub Actions (`deploy.yml`) al publicar una etiqueta `v*`.
- **Demostración gratuita: Render (backend) + Vercel (frontend)** → [DESPLIEGUE.md](DESPLIEGUE.md). Útil para mostrar el proyecto; el plan
  gratuito duerme el servidor, la base caduca a los 30 días y las fotos subidas no persisten.
- **Otro PaaS (Railway) o VPS propio:** el `backend/Dockerfile` funciona en cualquiera; `deploy/` sirve tal cual en cualquier VPS Linux
  con Docker (omita `infra/aws/`).

### Pruebas
```bash
cd backend
python manage.py test               # 67 pruebas (1 se omite sin PostgreSQL: la de concurrencia)
coverage run --source=apps,shared manage.py test && coverage report     # cobertura 96 %

cd ../e2e && npm ci && npx playwright install chromium
npx playwright test                 # 26 pruebas E2E (navegación, reservas, móvil, accesibilidad axe, SEO)

k6 run -e PROFILE=smoke loadtest/wexperiencias.js     # carga (ver docs/PRUEBAS-CARGA.md)
```
Todo esto corre solo en **GitHub Actions** en cada push y Pull Request (`.github/workflows/ci.yml`); la seguridad
(`pip-audit`, `npm audit`, OWASP ZAP) en `security.yml`. Detalle, cifras y desglose por módulo: [docs/PRUEBAS.md](docs/PRUEBAS.md).

Reglas de negocio pedidas: 1) solape → 409 · 2) reservas consecutivas permitidas · 3) cancelar libera fechas ·
4) el anfitrión no reserva lo suyo · 5) respeta `max_guests` · 6) flujo completo por API
(`apps/bookings/tests.py` y `apps/bookings/test_flow.py`).

**Concurrencia real:** `select_for_update()` solo bloquea en PostgreSQL. La prueba con hilos
(`apps/bookings/test_concurrency.py`) se omite en SQLite y **sí corre en el CI** (que usa PostgreSQL). Para correrla en su equipo:
```bash
DATABASE_URL=postgres://postgres:clave@localhost:5432/wexp python manage.py test apps.bookings.test_concurrency
```

## Variables de entorno (backend, ver `backend/.env.example`)
`SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL` (o `DB_ENGINE` + `DB_*`), `ENABLE_API_DOCS`, `SERVE_MEDIA`,
`PLATFORM_FEE_PERCENT` (10), `BOOKING_PENDING_HOURS` (48), `PAYMENT_GATEWAY` (`bank_transfer`|`simulated`),
`REVIEW_REQUIRE_CHECKOUT_PASSED`, `EMAIL_*`, `MEDIA_ROOT`, `NUM_PROXIES` (1 detrás de Nginx), `THROTTLE_RATE_*` (solo para pruebas de carga). Producción: `DJANGO_SETTINGS_MODULE=config.settings.production`
(exige `SECRET_KEY` y `ALLOWED_HOSTS`, activa HTTPS/HSTS y cookies seguras).

## API (`/api/v1/`) · JSON salvo CSV
Auth: `Authorization: Bearer <access>` (access 30 min, refresh 7 días con rotación). Listados paginados
`{count,next,previous,results}` con `page` y `page_size` (máx. 200). Errores: `{detail, code}` o `{campo: [mensajes]}`.

| Método y ruta | Descripción |
|---|---|
| `POST auth/register/` · `auth/login/` · `auth/refresh/` | Registro (rol huésped/anfitrión) y tokens. Login y registro con límite de intentos (429). |
| `GET/PATCH users/me/` | Perfil (nombre público, bio, teléfono, datos bancarios). |
| `GET health/` | Chequeo de salud. |
| `GET listings/?lat_min&lat_max&lng_min&lng_max&category&check_in&check_out&guests&difficulty&max_duration_hours&mine&ordering` | Búsqueda por bounding box, categoría, fechas libres (excluye solapes), capacidad y ficha técnica. |
| `POST listings/` | Publicar (solo anfitriones; JSON o multipart con `image` JPEG/PNG/WEBP ≤ 2 MB). |
| `GET/PUT/PATCH/DELETE listings/{id}/` | Detalle y edición (solo el dueño). `DELETE` = baja lógica; 409 si hay reservas vigentes. |
| `GET listings/{id}/booked-dates/` | `{mode, capacity, occupied:[{date, taken}]}`. |
| `POST bookings/` | Reservar. 400 datos/capacidad · 403 anfitrión · **409 fechas o cupos ocupados**. |
| `GET bookings/?as=guest\|host&status=` | Mis reservas / reservas recibidas. |
| `POST bookings/{id}/cancel/` · `reject/` · `complete/` · `PATCH notes/` | Transiciones (`pending→confirmed\|rejected\|cancelled`, `confirmed→cancelled\|completed`) y notas internas. |
| `GET bookings/{id}/payment-info/` | Monto, referencia y datos bancarios (solo el huésped). |
| `POST payments/` · `POST payments/{id}/confirm/` | Pagar / informar pago; el anfitrión confirma. Calcula comisión y neto. |
| `GET reviews/?listing={id}` · `POST reviews/` | Reseñas publicadas / reseñar (ciegas cruzadas). |
| `GET reports/summary/` · `reports/bookings.csv` · `reports/guests.csv` | Reportes por mes y oferta; CSV (con escape de fórmulas). |

## Reglas de negocio destacadas
- **Anti doble reserva:** transacción atómica + `select_for_update()` sobre la oferta; la salida de una reserva puede ser la llegada de otra.
- **Modo cupos (`shared`):** varias reservas por fecha hasta `max_guests`; el precio es por persona y día.
- **Reservas pendientes** vencen a las 48 h (`python manage.py expire_pending_bookings`, para cron) y dejan de bloquear fechas.
  Si el huésped ya informó su pago, no vencen: decide el anfitrión.
- **Pagos:** pasarela intercambiable (`PaymentGateway.charge/refund`). Por defecto `bank_transfer` (el huésped informa, el anfitrión
  confirma); `simulated` cobra al instante. Comisión 10 % y neto al anfitrión. Cancelar una reserva pagada la marca `refunded`
  mediante la señal `booking_cancelled` (`bookings` no importa `payments`).
- **Reseñas ciegas:** se publican las dos a la vez cuando huésped y anfitrión reseñaron la reserva confirmada.
- **Correos** al crear, confirmar y cancelar; un fallo de envío nunca rompe la reserva.

## Simplificaciones del MVP (documentadas)
- Sin PostGIS: bounding box simple con lat/lng. Sin Mapbox/Google Maps: Leaflet. Teselas: OpenStreetMap solo en desarrollo;
  **producción con MapTiler** (decisión y configuración en [docs/DECISION-TESELAS.md](docs/DECISION-TESELAS.md), variable `VITE_TILE_URL`).
- Sin Stripe/Webpay: pasarela simulada y transferencia informada con la misma interfaz.
- Imagen de portada opcional (volumen local `MEDIA_ROOT`) o foto por URL.
- API lista (JSON + JWT) para una futura app Android con React Native + Expo; no se construye.

## Decisiones y desvíos a tener presentes
- **Componentes shadcn escritos a mano** en `frontend/src/components/ui` (Radix + Tailwind): el CLI de shadcn no pudo descargar el
  registro en el entorno de construcción. `components.json` está incluido: `npx shadcn@latest add <componente>` funciona después.
- **JavaScript (no TypeScript)**, alineado con el informe (JavaScript ES2022); por eso `src/lib/labels.js`.
- **Reseñas en la ficha:** solo se muestran las del huésped sobre la oferta; las del anfitrión al huésped también se publican
  pero no se listan ahí. El promedio usa solo reseñas de huéspedes.
- **Tokens JWT en `localStorage`** (riesgo XSS conocido, mitigado con access de 30 min y rotación del refresh; mover el refresh
  a cookie HttpOnly queda para la v1.1 según el informe).
- **Throttling** usa la caché de Django (en memoria por proceso); con varios workers de Gunicorn conviene Redis o caché en base de datos.
- **Deuda técnica conocida:** `listings` consulta a `bookings` para calcular disponibilidad (un único selector, `bookings.selectors`).
- Las fotos de los datos demo vienen de `picsum.photos` (requieren internet).
- **Pendiente de ejecutar fuera del repositorio** (el material ya está preparado): primera corrida de OWASP ZAP en GitHub Actions,
  prueba de carga contra el entorno AWS real, despliegue de la plantilla `infra/aws/` en la cuenta de AWS, y la UAT con la clienta
  ([docs/UAT.md](docs/UAT.md)). Docker, CI/CD, E2E, carga, auditorías, accesibilidad/SEO, manual y runbooks **ya están incluidos**.
- Sin recuperación de contraseña por correo (la restablece un administrador) ni renderizado en servidor para vistas previas por oferta.
