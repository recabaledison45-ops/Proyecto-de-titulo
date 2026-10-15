# Seguridad: auditorías y escaneo dinámico (F-62)

Orden definido: **1) auditoría de dependencias (pip-audit y npm audit) → 2) escaneo dinámico (OWASP ZAP)**. Ambos corren en
`.github/workflows/security.yml`: en cada cambio de dependencias, **todos los lunes** (aparecen CVE nuevos aunque el código no cambie) y a pedido.

## 1. Auditoría de dependencias — resultados del 14-oct-2026
| Proyecto | Herramienta | Resultado inicial | Acción | Resultado final |
|---|---|---|---|---|
| backend (`requirements.txt`) | `pip-audit` | **2 vulnerabilidades** en `djangorestframework 3.16.1` | Actualizado a **3.17.2**; 67 pruebas y esquema OpenAPI siguen OK | **0** |
| frontend (producción y desarrollo) | `npm audit` | 0 | — | **0** |
| e2e (Playwright, axe) | `npm audit` | 0 | — | **0** |

Detalle de los hallazgos corregidos:
- **PYSEC-2026-3827 / CVE-2026-73228 / GHSA-2m8g-3cmr-wg3w** — `request.data` de DRF no respetaba `DATA_UPLOAD_MAX_MEMORY_SIZE` para cuerpos
  `application/json` y `x-www-form-urlencoded` (posible agotamiento de memoria con cuerpos enormes). *Mitigación adicional ya presente:*
  Nginx limita el cuerpo a 6 MB (`client_max_body_size`).
- **PYSEC-2026-3828 / CVE-2026-73229 / GHSA-g47c-3xmw-q6m2** — `AdminRenderer` podía exponer datos protegidos en respuestas 400. *El proyecto
  solo usa `JSONRenderer`, por lo que no estaba expuesto*, pero se actualizó igualmente.

Reproducir:
```bash
pip install pip-audit && pip-audit -r backend/requirements-dev.txt --strict
cd frontend && npm audit --audit-level=high          # idem en e2e/
```
`pip-audit`/`npm audit` solo conocen vulnerabilidades **publicadas**: un resultado en cero no significa ausencia de fallos.
Dependabot (`.github/dependabot.yml`) abre solicitudes semanales de actualización.

## 2. OWASP ZAP
**Qué se escanea.**
| Job | Objetivo | Tipo | Cuándo |
|---|---|---|---|
| `zap-api` | API levantada en el runner con base desechable y datos demo, importando el esquema OpenAPI (`/api/schema/`), **autenticado** como `huesped` | Escaneo de API (pasivo + activo) | Semanal y manual |
| `zap-baseline` | Sitio desplegado (variable de repositorio `ZAP_TARGET_URL`, p. ej. `https://wexperiencias.cl`) | Línea base (pasivo: cabeceras, cookies, CSP, TLS) | Semanal y manual, solo si la variable existe |

**Cómo se interpretan los resultados.** ZAP termina con código 0 (limpio), 2 (avisos) o 1 (fallas). El workflow solo se
marca como fallido con *fallas* (1) o errores de ejecución; los *avisos* se revisan en el informe HTML/JSON que queda como artefacto
(`zap-api-report`, 30 días). Cada aviso se clasifica: corregir, o aceptar con justificación por escrito en la tabla de abajo (y entonces
se agrega al archivo de reglas de ZAP).

**Estado.** El workflow está escrito y validado sintácticamente (`actionlint`), pero **todavía no se ejecutó**: requiere Docker y
GitHub Actions (el entorno donde se desarrolló no tiene demonio Docker). **Primera ejecución pendiente:** *Actions → Seguridad → Run workflow*;
registrar aquí los resultados antes de la entrega.

| Fecha | Objetivo | Fallas | Avisos | Decisión sobre cada aviso |
|---|---|---|---|---|
| | API (autenticado) | | | |
| | Sitio desplegado | | | |

**Avisos que se esperan y por qué** (para no sorprenderse en la primera corrida):
- *CSP: `style-src 'unsafe-inline'`* — la interfaz (Leaflet, Radix) usa estilos en línea; los **scripts** sí están restringidos a `'self'`.
- *Cabeceras de caché en API* — las respuestas JSON no llevan `Cache-Control: no-store` (la API no devuelve datos sensibles cacheables
  entre usuarios porque va con `Authorization`); se puede agregar si ZAP lo exige.
- *Cross-Origin-Embedder/Resource-Policy ausentes* — no aplican a una SPA sin recursos incrustados de terceros críticos.

## 3. Controles ya implementados (referencia para el informe)
| Área | Control |
|---|---|
| Autenticación | JWT con access 30 min, refresh 7 días con rotación y lista negra; límite 5 intentos/min en login |
| Autorización | Permisos por rol y por dueño; el anfitrión no reserva lo suyo; datos bancarios solo al huésped de la reserva |
| Entrada | Validación en serializers; imágenes JPEG/PNG/WEBP ≤ 2 MB; CSV con escape de fórmulas (inyección CSV) |
| Integridad | Anti doble reserva con transacción y `select_for_update()`; estados validados por máquina de estados |
| Transporte | TLS 1.2/1.3 (Let's Encrypt), HSTS 1 año, redirección HTTP→HTTPS, cookies seguras |
| Cabeceras | CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP |
| Configuración | Producción se niega a arrancar sin `SECRET_KEY` fuerte, `ALLOWED_HOSTS` y CORS explícitos; `DEBUG` siempre apagado |
| Denegación de servicio | Límites por IP en Nginx (30 req/s API, 10/min auth) y Django (300/600 por minuto), cuerpo máx. 6 MB |
| Infraestructura | Sin SSH (SSM), IMDSv2, disco y S3 cifrados, IAM de mínimos privilegios, despliegue por OIDC sin claves guardadas |
| Cadena de suministro | Dependencias fijadas, Dependabot, pip-audit/npm audit semanales, imágenes con usuario sin privilegios |

## 4. Riesgos conocidos y aceptados
- **Tokens en `localStorage`:** un XSS podría robarlos. Mitigación: CSP con `script-src 'self'`, access de 30 min y rotación. Mover el
  refresh a cookie HttpOnly queda para la v1.1.
- **Recuperación de contraseña por correo:** no existe en el MVP (la restablece un administrador).
- **Una sola instancia / un solo disco:** ver límites de disponibilidad en [DESPLIEGUE-AWS.md](DESPLIEGUE-AWS.md).
- **Clave de MapTiler visible en el JavaScript:** es lo normal en mapas web; se restringe por dominio en el panel del proveedor.
