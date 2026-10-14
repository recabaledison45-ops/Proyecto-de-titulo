# W Experiencias · MVP de reservas turísticas

Marketplace bilateral para turismo regenerativo y de bienestar (Región del Maule): **alojamientos, paquetes turísticos,
guías locales y actividades/tours** bajo un mismo motor de búsqueda, reservas, pagos y reseñas.

- **Backend:** Django 5.2 + Django REST Framework, monolito modular, API 100 % JSON, auth JWT (`simplejwt`).
- **Frontend:** React 19 + Vite + React Router, Axios con renovación automática del token, Tailwind CSS v4 + componentes
  estilo shadcn/ui, mapa con Leaflet (sin API key).
- **Base de datos:** SQLite por defecto; PostgreSQL con variables de entorno.

```
backend/
├── manage.py
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

### Pruebas
```bash
cd backend
python manage.py test               # 65 pruebas (1 se omite sin PostgreSQL)
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
`SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DB_ENGINE` (`sqlite`|`postgres`) + `DB_*`,
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
