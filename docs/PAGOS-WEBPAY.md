# Pago con tarjeta: Webpay Plus (Transbank)

El huésped puede pagar su reserva con **tarjeta de débito, crédito o prepago**. El pago se hace en el sitio de Transbank:
W Experiencias **nunca recibe ni guarda datos de tarjetas** (por eso no le aplican las exigencias PCI de quien las almacena).

> **Estado actual: ambiente de INTEGRACIÓN (pruebas).** Funciona de punta a punta con las tarjetas de prueba de Transbank y
> **no mueve dinero real**. Para cobrar de verdad hay que contratar Webpay Plus y pasar la validación de Transbank (sección 4).

## 1. Cómo funciona
```
Huésped                    W Experiencias (frontend / backend)                 Transbank
  │ Pagar con tarjeta ───────► POST /api/v1/payments/webpay/ {booking}
  │                             · valida: es su reserva, está pendiente, no venció
  │                             · crea la transacción ──────────────────────────► POST /transactions
  │                             · guarda el pago "pending" con el token ◄──────── {token, url}
  │ ◄── formulario token_ws ───
  │ ───────────────────────────────── paga en el sitio de Transbank ───────────►
  │ ◄──────── redirección a /api/v1/payments/webpay/return/?token_ws=… ─────────
  │                             · confirma el cargo ────────────────────────────► PUT /transactions/{token}
  │                             · aprobado → pago "succeeded" + reserva confirmada + correo
  │ ◄── redirección a /payments/result (comprobante leído de la API)
```
Decisiones de diseño que protegen el dinero y las fechas:
| Situación | Qué hace el sistema |
|---|---|
| Tarjeta rechazada | Pago `failed`, sin cargo, la reserva sigue pendiente y se puede reintentar (con tarjeta o transferencia) |
| El huésped anula en Webpay, o se agota el tiempo del formulario | Pago `failed`, sin cargo |
| El huésped cierra el navegador antes de volver | No se confirma → Transbank reversa sola; la reserva sigue pendiente |
| El navegador repite el retorno (recargar, botón atrás) | Idempotente: no se confirma dos veces |
| La reserva venció o se canceló **mientras** pagaba, o el monto/orden no coinciden | El cargo aprobado se **devuelve de inmediato** a la tarjeta |
| Se cancela una reserva ya pagada con tarjeta | Devolución automática a la tarjeta (reversa o anulación) |
| Transbank no acepta la devolución | La cancelación igual se hace; el pago queda `refund_pending` para gestión manual (visible en `/admin/`) |
| Alguien cambia `?status=success` en la dirección | No sirve: el comprobante sale del estado real consultado a la API |
| Se pierde la respuesta de la confirmación (corte de red) | Consulta el estado de la transacción y completa el pago si fue autorizado |
| Transbank caído al iniciar | Error 503 con mensaje claro; no queda ningún pago a medias |

## 2. Probarlo (ambiente de integración, sin cuenta ni contrato)
No hay que configurar nada: por defecto `WEBPAY_ENV=integration` usa las credenciales públicas de pruebas de Transbank.
1. Levante backend y frontend, ingrese como huésped, reserve y pulse **Pagar → Pagar con tarjeta**.
2. En el formulario de Transbank use los datos de prueba:

| Medio | Número | Resultado |
|---|---|---|
| VISA crédito | `4051 8856 0044 6623` · CVV `123` · cualquier vencimiento | Aprobada |
| Mastercard crédito | `5186 0595 5959 0568` · CVV `123` · cualquier vencimiento | Rechazada |
| Redcompra débito | `4051 8842 3993 7763` | Aprobada |
| Banco simulado (autenticación) | RUT `11.111.111-1` · clave `123` | — |

3. Al volver verá el comprobante y la reserva confirmada.

Las tarjetas de prueba son las que publica Transbank en su documentación para desarrolladores; si alguna deja de funcionar, consulte
la lista vigente en <https://www.transbankdevelopers.cl/documentacion/como_empezar#ambiente-de-integracion>.

Comprobar la conexión y las credenciales sin navegador: `python manage.py webpay_check`.

**Si lo prueba en su computador:** Transbank devuelve al navegador a `http://127.0.0.1:8000/api/v1/payments/webpay/return/`, por lo que
el backend debe estar en el puerto 8000 y `FRONTEND_URL=http://localhost:5173` (valores por defecto).

## 3. Variables
| Variable | Valor | Para qué |
|---|---|---|
| `WEBPAY_ENABLED` | `true` / `false` | Ofrecer o no el pago con tarjeta |
| `WEBPAY_ENV` | `integration` (por defecto) / `production` | Ambiente de Transbank |
| `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY` | del contrato | Obligatorias en `production` (el servidor no arranca sin ellas) |
| `WEBPAY_RETURN_URL` | opcional | URL de retorno fija, si el backend no conoce su dominio público |
| `FRONTEND_URL` | `https://su-dominio` | A dónde vuelve el huésped con el resultado |

## 4. Pasar a producción (cobrar dinero real)
Esto **no se puede hacer solo con código**; depende de un trámite comercial con Transbank:
1. **Contratar Webpay Plus** (requiere empresa o persona con inicio de actividades y cuenta bancaria en Chile): <https://publico.transbank.cl>.
   Transbank entrega un **código de comercio**.
2. **Validación de la integración:** Transbank pide evidencias de pruebas en el ambiente de integración (pago aprobado, rechazado, anulado,
   reembolso, y que el comprobante muestre orden de compra, monto, código de autorización, fecha, tipo de pago, cuotas y últimos 4 dígitos —
   la página de resultado ya los muestra). Al aprobarla entregan la **llave secreta (API Key)** de producción.
3. En `deploy/.env.prod`: `WEBPAY_ENV=production`, `WEBPAY_COMMERCE_CODE=…`, `WEBPAY_API_KEY=…` y `./scripts/deploy.sh`.
4. `python manage.py webpay_check` y un pago real de monto bajo, seguido de su cancelación para probar la devolución.

## 5. Limitaciones conocidas (declararlas en el informe)
- **Validado contra un Webpay simulado y, en CI, contra el ambiente de integración real solo en la creación y consulta de una
  transacción.** El pago completo con tarjeta de prueba en Transbank es una prueba manual pendiente (sección 2): el entorno donde se
  desarrolló no tiene salida a internet hacia Transbank.
- **Todo el dinero llega a la cuenta del comercio (la plataforma).** El pago del neto a cada anfitrión (monto menos 10 % de comisión)
  es **manual**: el sistema registra cuánto corresponde (`host_payout`, reportes CSV), pero no transfiere.
- Devoluciones siempre por el **total** (no hay reembolso parcial ni política de cancelación con retención).
- Solo pesos chilenos sin decimales. Sin cuotas configurables ni Oneclick (tarjeta guardada).
- Si la respuesta de la confirmación se pierde por un corte de red, el sistema consulta el estado de la transacción y la da por pagada
  si Transbank la autorizó. Si tampoco se puede consultar, el pago queda `pending` y el huésped ve "No pudimos confirmar el pago";
  volver a abrir el enlace de retorno lo resuelve. **No hay conciliación automática periódica** contra Transbank.
