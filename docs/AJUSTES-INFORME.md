# Ajustes a realizar en el informe

> **Aviso:** quien preparó este documento **no tuvo acceso al archivo del informe**; trabajó con las referencias que se indicaron
> (KPI-08, tablas 3, 41 y 42, y la sección de arquitectura). Cada ajuste dice **qué verificar** y **qué texto/valor poner**. Todas las cifras
> de abajo se obtuvieron ejecutando el repositorio el 14-oct-2026 y se pueden reproducir con los comandos de [PRUEBAS.md](PRUEBAS.md).

## 1. Número de pruebas: README vs. informe (18)

> Actualizado el 13-nov-2026: al agregar el pago con tarjeta el total subió de 93 a **121** (91 backend + 30 E2E).

**Qué es verdad hoy:**
| Concepto | Cantidad |
|---|---|
| Pruebas automatizadas del **backend** (Django) | **91** — 90 en SQLite + 1 de concurrencia que solo corre en PostgreSQL (en el CI corren las 67) |
| Pruebas **E2E** del navegador (Playwright), incl. accesibilidad, SEO y pago con tarjeta | **30** |
| **Total automatizado** | **121** |
| Cobertura de líneas del backend | 95 % |

**De dónde puede venir el "18":** coincide exactamente con las pruebas de `apps/bookings/tests.py` (18) y con las de
`apps/listings/tests.py` (18), o con una versión anterior del conjunto. Compruébelo contra su versión del informe; lo importante es
que **el informe y el README digan lo mismo**.

**Qué cambiar:**
| Lugar | Acción |
|---|---|
| **KPI-08** (pruebas automatizadas) | Reemplazar 18 por **121 pruebas automatizadas (91 backend + 30 E2E)**, o por 91 si el KPI mide solo el backend; en ambos casos citar la cobertura de 95 %. Si la meta del KPI era ≥ 18, el resultado es *superada* |
| **Tabla 3** | Actualizar el total y, si la tabla desglosa por módulo, usar la tabla de [PRUEBAS.md](PRUEBAS.md) (bookings 18 + flow 1 + reports 5 + concurrencia 1, listings 18, payments 10 + Webpay 24, reviews 6, users 8) |
| **Tabla 41** y **Tabla 42** | Igual: sustituir el 18 por el valor que corresponda (91 / 30 / 121) según lo que mida cada tabla, y agregar las columnas "E2E" y "Carga" si no existen |
| Texto que mencione "18 pruebas" | Buscar `18` en el documento completo (Ctrl+F) para no dejar ninguna referencia antigua |

Texto sugerido (resultados de pruebas):
> El proyecto cuenta con **121 pruebas automatizadas**: 91 pruebas unitarias y de integración del backend (cobertura de líneas del 95 %,
> incluida una prueba de concurrencia sobre PostgreSQL que verifica que dos reservas simultáneas de las mismas fechas no puedan quedar ambas aceptadas)
> y 30 pruebas extremo a extremo con Playwright que recorren los flujos de búsqueda, registro, reserva, pago con tarjeta y gestión del anfitrión, la versión móvil,
> la accesibilidad (axe-core, WCAG 2.1 AA) y el SEO básico. Se ejecutan automáticamente en cada cambio mediante GitHub Actions.

## 2. Arquitectura: el informe dice VPS + Docker + Nginx, el repositorio estaba en Vercel y Render

**Decisión tomada (alineada con lo pedido): el informe se mantiene y el repositorio se alinea a él, en AWS.**

| El informe dice | El repositorio ahora entrega |
|---|---|
| VPS | **Instancia EC2** de AWS (`infra/aws/wexperiencias.yml`) con IP elástica |
| Docker | `backend/Dockerfile` (multi-stage), `deploy/nginx/Dockerfile` y `deploy/docker-compose.prod.yml` |
| Nginx | `deploy/nginx/`: TLS, proxy a Django, SPA, límites de peticiones, cabeceras de seguridad |
| HTTPS | Let's Encrypt (`scripts/init-letsencrypt.sh`) con renovación automática |
| (respaldos / monitoreo) | `scripts/backup.sh` → S3; alarmas de CloudWatch + SNS; `scripts/healthcheck.sh` |
| CI/CD | `.github/workflows/` (`ci.yml`, `security.yml`, `loadtest.yml`, `deploy.yml`) |

**Vercel + Render siguen existiendo, pero con otro rol:** entorno de *demostración y pruebas* gratuito (`DESPLIEGUE.md`). En el informe debe
decirse así; **no** presentarlos como la arquitectura de producción.

Texto sugerido (sección de arquitectura / despliegue):
> El sistema se despliega en un servidor virtual en la nube de Amazon Web Services (instancia EC2 con Amazon Linux 2023). Sobre él, Docker Compose
> ejecuta tres contenedores: Nginx (termina TLS con certificados de Let's Encrypt, sirve la aplicación React y actúa de proxy inverso), el backend
> Django con gunicorn y la base de datos PostgreSQL 16 con volumen persistente. Los respaldos diarios se almacenan cifrados en Amazon S3, y el
> monitoreo (estado de la aplicación, CPU, memoria, disco y respaldos) se realiza con Amazon CloudWatch, con avisos por correo mediante Amazon SNS.
> La infraestructura se define como código (AWS CloudFormation) y los despliegues se ejecutan desde GitHub Actions sin credenciales almacenadas.
> Para demostraciones se mantiene un entorno gratuito en Render (backend) y Vercel (frontend).

Revise también: **diagramas de arquitectura y de despliegue** (usar el esquema de [DESPLIEGUE-AWS.md](DESPLIEGUE-AWS.md)), la tabla de tecnologías,
la estimación de costos (≈ US$ 22–25/mes; verificar precios vigentes) y cualquier mención a "VPS genérico" o "proveedor por definir".
*Alternativa:* si el informe debiera conservar "VPS" literalmente, basta con decir "VPS (instancia EC2 de AWS)" — la arquitectura es la misma.

## 3. Estado de los entregables del plan (para la tabla de avance / conclusiones)

| ID | Entregable | Estado | Evidencia en el repositorio | Pendiente |
|---|---|---|---|---|
| F-20 | CI/CD con GitHub Actions | **Hecho** (CI en verde en GitHub: backend/PostgreSQL, frontend, E2E, imágenes Docker) | `.github/workflows/ci.yml`, `deploy.yml`, `dependabot.yml` | `deploy.yml` se probará en el primer despliegue real a AWS |
| F-21 | Despliegue completo: Nginx, TLS, respaldos, monitoreo | **Preparado y validado estáticamente** | `deploy/`, `infra/aws/`, [DESPLIEGUE-AWS.md](DESPLIEGUE-AWS.md) | **Desplegar en la cuenta AWS** y probar respaldo/restauración (no hay Docker ni AWS en el entorno de desarrollo) |
| F-60 | Pruebas E2E con Playwright | **Hecho** (30/30 verdes) | `e2e/` | — |
| F-61 | Pruebas de carga con k6 | **Hecho** (script + umbrales + corrida local) | `loadtest/`, [PRUEBAS-CARGA.md](PRUEBAS-CARGA.md) | Repetir `load` y `stress` contra AWS y anotar resultados |
| F-62 | pip-audit, npm audit y OWASP ZAP | **Auditorías hechas; ZAP de la API ejecutado sin fallas** | [SEGURIDAD.md](SEGURIDAD.md), `security.yml` | Clasificar los avisos del informe de ZAP y escanear el sitio ya desplegado (`ZAP_TARGET_URL`) |
| F-63 | Accesibilidad y SEO básico | **Hecho** (automatizado) | [ACCESIBILIDAD-SEO.md](ACCESIBILIDAD-SEO.md), `e2e/tests/a11y.spec.js`, `seo.spec.js` | Revisión manual (lista incluida) y Lighthouse en producción; imagen `og:image` |
| F-69 | Proveedor de teselas del mapa | **Decidido** | [DECISION-TESELAS.md](DECISION-TESELAS.md), `mapConfig.js` | Crear la cuenta/clave de MapTiler restringida por dominio |
| F-65 | Manual de usuario y runbooks | **Hecho** | [MANUAL-DE-USUARIO.md](MANUAL-DE-USUARIO.md), [RUNBOOKS.md](RUNBOOKS.md) | Completar la tabla de contactos de los runbooks |
| F-64a | Preparación de la UAT | **Hecho** | [UAT.md](UAT.md) | Fijar fecha y participantes |
| F-64b | Ejecución de la UAT y acta | **Pendiente (depende de la clienta)** | Plantilla de acta en [UAT.md](UAT.md) | Realizar la sesión y firmar el acta |

## 4. Otros cambios del repositorio que el informe puede mencionar
- **Dos vulnerabilidades reales** encontradas por `pip-audit` en Django REST Framework 3.16.1 y corregidas (3.17.2): sirven como evidencia concreta de F-62.
- **Tres defectos de accesibilidad** encontrados por axe y corregidos (listas de definición mal anidadas, enlace enfocable dentro de un panel oculto).
- **Protección ante falsificación de IP** detrás de un proxy (`NUM_PROXIES`): sin ella el límite de peticiones se podía evadir.
- **Cambio de teselas** de OpenStreetMap público (sin garantías; no apto para producción) a MapTiler.
- **Limitaciones declaradas** (útiles para el capítulo de conclusiones / trabajo futuro): una sola instancia (sin alta disponibilidad); sin recuperación
  de contraseña por correo; tokens en `localStorage`; SPA sin renderizado en servidor; pago con tarjeta integrado con Webpay Plus pero **en ambiente de integración (pruebas)**: cobrar dinero real requiere el contrato y la validación de Transbank; el pago a los anfitriones (liquidación) es manual.

## 5. Pago con tarjeta (agregado el 13-nov-2026)
Si el informe dice "pago por transferencia" o "pasarela simulada", actualícelo: el sistema ahora ofrece **tarjeta de débito, crédito o prepago
mediante Webpay Plus (Transbank)** además de la transferencia. Texto sugerido:
> El pago se realiza con tarjeta a través de Webpay Plus de Transbank: el huésped es redirigido al formulario seguro de Transbank (la plataforma no
> recibe ni almacena datos de tarjetas), y al volver el servidor confirma la transacción, registra el comprobante y confirma la reserva de inmediato.
> Las cancelaciones generan la devolución automática a la misma tarjeta. Como alternativa se mantiene la transferencia bancaria informada.
> La integración se validó en el ambiente de pruebas de Transbank; la operación con dinero real requiere el contrato comercial y el proceso de validación de Transbank.

Detalle técnico y pasos para producción: [PAGOS-WEBPAY.md](PAGOS-WEBPAY.md).
