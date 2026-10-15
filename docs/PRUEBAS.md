# Estrategia y resultados de pruebas (F-20 · F-60 · F-63)

Todo se ejecuta **automáticamente en GitHub Actions** (`.github/workflows/ci.yml`) en cada push a `main` y en cada Pull Request.

## Resumen verificado (14-oct-2026)
| Nivel | Herramienta | Cantidad | Resultado |
|---|---|---|---|
| Unitarias y de integración del backend | Django `TestCase` + DRF | **67** (66 en SQLite + 1 de concurrencia que solo corre en PostgreSQL, como en CI) | OK · cobertura de líneas **96 %** (umbral CI: 90 %) |
| Extremo a extremo (navegador real) | Playwright (Chromium) | **26** | OK |
| · navegación pública, búsqueda y favoritos | | 7 | OK |
| · registro, ingreso, reserva y panel del anfitrión | | 5 | OK |
| · móvil (390 px) | | 3 | OK |
| · accesibilidad WCAG 2.1 A/AA (axe) y teclado | | 7 | OK |
| · SEO básico | | 4 | OK |
| Carga | k6 | 3 perfiles (smoke · load · stress) | `load` 50 usuarios: ver [PRUEBAS-CARGA.md](PRUEBAS-CARGA.md) |
| Seguridad de dependencias | pip-audit · npm audit | backend · frontend · e2e | 0 vulnerabilidades tras la corrección (ver [SEGURIDAD.md](SEGURIDAD.md)) |
| Seguridad dinámica | OWASP ZAP (API scan) | semanal y manual | Workflow listo; ver [SEGURIDAD.md](SEGURIDAD.md) |

**Total automatizado: 93 pruebas** (67 + 26) además de las verificaciones de CI (migraciones, `check --deploy`, esquema OpenAPI,
lint, build, imágenes Docker y configuración de Nginx).

### Desglose de las 67 pruebas del backend
| Módulo | Pruebas | Qué cubre |
|---|---|---|
| `apps.bookings.tests` | 18 | Reglas de reserva: solape → 409, reservas consecutivas, cancelar libera fechas, anfitrión no reserva lo suyo, `max_guests`, estados |
| `apps.bookings.test_flow` | 1 | Flujo completo por API (registro → publicar → reservar → pagar → confirmar → reseñar) |
| `apps.bookings.test_reports` | 5 | Reportes por mes/oferta y CSV con escape de fórmulas |
| `apps.bookings.test_concurrency` | 1 | Doble reserva simultánea con hilos (**solo PostgreSQL**: `select_for_update`) |
| `apps.listings.tests` | 18 | Búsqueda por mapa/fechas/personas/texto, orden por valoración, ficha técnica, dueño, baja lógica |
| `apps.payments.tests` | 10 | Comisión 10 %, pasarelas, confirmación, reembolso por cancelación |
| `apps.reviews.tests` | 6 | Reseñas ciegas cruzadas y promedio |
| `apps.users.tests` | 8 | Registro, JWT, perfil, límite de intentos |

## Cómo ejecutarlas

### Backend
```bash
cd backend
pip install -r requirements-dev.txt
python manage.py test                                    # SQLite (la prueba de concurrencia se omite)
coverage run --source=apps,shared manage.py test && coverage report
# Con PostgreSQL (como en CI), incluye la prueba de concurrencia:
DATABASE_URL=postgres://usuario:clave@localhost:5432/wexp_test python manage.py test
```

### E2E (Playwright) y accesibilidad
```bash
cd frontend && npm ci && cd ../e2e && npm ci
npx playwright install chromium       # una vez (en Linux agregue --with-deps)
npx playwright test                   # levanta solo backend (puerto 8765, base SQLite desechable) y frontend (5199)
npx playwright show-report            # informe HTML
```
Variables útiles: `E2E_PYTHON` (ruta al Python del entorno virtual del backend), `PW_CHROMIUM_PATH` (Chromium ya instalado).
Las pruebas **no usan internet**: las fotos (`picsum.photos`) y las teselas del mapa se simulan; la API es real.
En Windows (PowerShell): `$env:E2E_PYTHON="..\backend\.venv\Scripts\python.exe"; npx playwright test`.

### Carga
Ver [PRUEBAS-CARGA.md](PRUEBAS-CARGA.md).

## Hallazgos que corrigieron las pruebas
1. **Accesibilidad** (axe, gravedad *serious*): lista de definición `<dl>` con estructura inválida en la ficha de la oferta;
   enlace enfocable dentro de un panel `aria-hidden` en ingreso y registro. Corregidos.
2. **Seguridad** (pip-audit): `djangorestframework 3.16.1` con dos CVE; actualizado a 3.17.2.
3. **Operación** (revisión para k6): el límite de peticiones se podía evadir falsificando `X-Forwarded-For` detrás de un proxy;
   ahora existe `NUM_PROXIES` (=1 en el despliegue AWS) y Nginx sobrescribe la cabecera.

## Qué NO cubre (y cómo se complementa)
- Pruebas automáticas de accesibilidad detectan ~30–40 % de los problemas WCAG: ver lista manual en [ACCESIBILIDAD-SEO.md](ACCESIBILIDAD-SEO.md).
- Solo se prueba Chromium; Firefox/Safari quedan para revisión manual en la UAT.
- La pasarela de pago real (Webpay/Stripe) no existe en el MVP: se prueban la simulada y la transferencia informada.
