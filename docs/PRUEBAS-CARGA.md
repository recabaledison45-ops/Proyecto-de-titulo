# Pruebas de carga con k6 (F-61)

Script: [`loadtest/wexperiencias.js`](../loadtest/wexperiencias.js). Modela dos tipos de usuario con pausas realistas
(1–5 s entre acciones):
- **browse (~90 % de los usuarios):** portada → búsquedas (texto, categoría, mapa) → ficha de oferta → fechas ocupadas.
- **book (~10 %):** inicia sesión con un usuario demo, consulta *Mis reservas* y crea una reserva (201, o 409/400 esperables).

## Perfiles
| Perfil | Usuarios simultáneos | Duración | Para qué |
|---|---|---|---|
| `smoke` | 1 + 1 | 30 s | Comprobar que el script y el entorno funcionan (corre en cada push a `main` que toque `backend/` o `loadtest/`) |
| `load` | 45 navegando + 5 reservando | ≈ 6 min | Carga normal esperada ×5 |
| `stress` | hasta 180 + 20 | ≈ 9 min | Encontrar el punto de quiebre |

## Criterios de aceptación (umbrales; si no se cumplen, k6 termina con error)
| Métrica | Umbral |
|---|---|
| Peticiones fallidas (5xx, timeouts, respuestas no esperadas) | < 1 % |
| `GET /health/` p95 | < 300 ms |
| Listados p95 / p99 | < 800 ms / < 2 s |
| Búsquedas p95 | < 1 s |
| Detalle de oferta p95 | < 800 ms |
| Crear reserva p95 | < 1,5 s |
| Verificaciones (`check`) correctas | > 99 % |

## Cómo ejecutarla
```bash
# 1) Instalar k6: https://grafana.com/docs/k6/latest/set-up/install-k6/   (Windows: winget install k6)
# 2) Entorno de PRUEBAS con límites de peticiones altos y datos demo:
#    THROTTLE_RATE_ANON=100000/min THROTTLE_RATE_USER=100000/min THROTTLE_RATE_LOGIN=100000/min  (+ SEED_DEMO=true)
k6 run -e BASE_URL=http://127.0.0.1:8000/api/v1 -e PROFILE=smoke loadtest/wexperiencias.js
k6 run -e BASE_URL=https://staging.midominio.cl/api/v1 -e PROFILE=load --summary-export=resumen.json loadtest/wexperiencias.js
```
GitHub Actions: *Actions → Carga (k6) → Run workflow* (elige URL y perfil; vacío = backend levantado en el propio runner).

> **Por qué hay que subir los límites:** el backend permite 300 peticiones/min por IP anónima. k6 corre desde una sola IP, así que sin
> subirlos mediría el límite de peticiones (429), no el rendimiento. **No** suba esos valores en producción.
> No ejecute `load` ni `stress` contra producción: crean reservas reales del usuario `huesped`.

## Resultado de referencia (14-oct-2026) — perfil `load`, entorno de desarrollo
Backend con `config.settings.production`, gunicorn con 3 workers, **SQLite** y datos demo, en el mismo equipo que k6:

| Métrica | Resultado |
|---|---|
| Peticiones | 11.490 en 6 min (≈ 31,6 por segundo) · 2.027 iteraciones |
| Fallidas | **0 %** |
| Verificaciones correctas | 100 % (13.300 de 13.300) |
| Listados p95 / p99 | 18 ms / 30 ms |
| Búsquedas p95 | 15 ms |
| Detalle p95 | 12 ms |
| Health p95 | 4 ms |
| Crear reserva p95 | 92 ms (214 intentos) |
| Umbrales | **8 de 8 cumplidos** |

**Cómo interpretarlo con honestidad:** es una medición *de humo ampliada* en un entorno que no es el de producción (SQLite, sin red,
sin Nginx ni TLS, k6 compitiendo por la misma CPU). Sirve para validar el script y detectar regresiones, **no** para dimensionar AWS.
Antes de la entrega hay que repetir `load` y `stress` contra el entorno de pruebas desplegado en AWS (instancia t3.small con
PostgreSQL) y registrar aquí esos números. Con las pausas realistas de este modelo, 50 usuarios simultáneos generan ≈ 32 peticiones
por segundo; la carga real del MVP (decenas de visitas por hora) está muy por debajo.

### Plantilla para registrar la corrida en AWS
| Fecha | Perfil | Instancia | Fallidas | Listados p95 | Reserva p95 | ¿Umbrales OK? | Observaciones |
|---|---|---|---|---|---|---|---|
| | load | t3.small | | | | | |
| | stress | t3.small | | | | | punto de quiebre: ___ usuarios |
