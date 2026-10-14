# W Experiencias · MVP de reservas turísticas

Marketplace bilateral para turismo regenerativo y de bienestar (Región del Maule): **alojamientos, paquetes turísticos,
guías locales y actividades/tours** bajo un mismo motor de búsqueda, reservas, pagos y reseñas.

- **Backend:** Django 5.2 + Django REST Framework, monolito modular, API 100 % JSON, auth JWT (`simplejwt`).
- **Frontend:** React 19 + Vite + React Router, Axios con renovación automática del token, Tailwind CSS v4 + componentes
  estilo shadcn/ui, mapa con Leaflet (sin API key).
- **Base de datos:** SQLite por defecto; PostgreSQL con variables de entorno.

```
backend/
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
```

Cada app separa `models.py`, `serializers.py`, `services.py` (escritura y reglas de negocio), `selectors.py` (lecturas),
`views.py` (delgadas), `urls.py` y `admin.py`.

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

### 4. Desplegar en un PaaS (Railway / Render) o VPS
- **Railway / Render:** apunte el servicio a `backend/` (usa el `Dockerfile`), agregue un PostgreSQL y defina
  `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` y `DATABASE_URL` (la entrega la plataforma).
  La plataforma inyecta `PORT`; su proxy TLS envía `X-Forwarded-Proto`, ya contemplado. Para las imágenes subidas monte un
  volumen en `/app/media` y use `SERVE_MEDIA=true`.
- **VPS:** `docker compose up -d --build` detrás de Nginx/Caddy con TLS (proxy a `127.0.0.1:8000` con la cabecera
  `X-Forwarded-Proto`). Con Nginx puede servir `/media/` desde el volumen y dejar `SERVE_MEDIA=false`.

### Pruebas
```bash
cd backend
python manage.py test               # 67 pruebas (1 se omite sin PostgreSQL)
coverage run --source=apps manage.py test && coverage report
```
Reglas de negocio pedidas: 1) solape → 409 · 2) reservas consecutivas permitidas · 3) cancelar libera fechas ·
4) el anfitrión no reserva lo suyo · 5) respeta `max_guests` · 6) flujo completo por API
(`apps/bookings/tests.py` y `apps/bookings/test_flow.py`).

**Concurrencia real:** `select_for_update()` solo bloquea en PostgreSQL. La prueba con hilos
(`apps/bookings/test_concurrency.py`) se omite en SQLite; para correrla:
```bash
DB_ENGINE=postgres DB_NAME=wexp DB_USER=postgres DB_PASSWORD=... DB_HOST=localhost python manage.py test apps.bookings.test_concurrency
```

## Variables de entorno (backend, ver `backend/.env.example`)
`SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL` (o `DB_ENGINE` + `DB_*`), `ENABLE_API_DOCS`, `SERVE_MEDIA`,
`PLATFORM_FEE_PERCENT` (10), `BOOKING_PENDING_HOURS` (48), `PAYMENT_GATEWAY` (`bank_transfer`|`simulated`),
`REVIEW_REQUIRE_CHECKOUT_PASSED`, `EMAIL_*`, `MEDIA_ROOT`. Producción: `DJANGO_SETTINGS_MODULE=config.settings.production`
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
- Sin PostGIS: bounding box simple con lat/lng. Sin Mapbox/Google Maps: Leaflet con teselas CARTO/OSM
  (**revisar sus términos de uso antes de producción**; se cambian con `VITE_TILE_URL`).
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
- Fuera del alcance de este paquete (se arma aparte): Docker, CI/CD, despliegue en AWS, E2E/carga/seguridad e informe.
