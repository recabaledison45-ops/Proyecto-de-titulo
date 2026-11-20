# Herramientas de video

Scripts con los que se produjeron los videos del proyecto. No son parte de la aplicación ni se despliegan; quedan versionados
para poder regenerar o editar los videos. Los videos terminados están en la sección **Releases** del repositorio.

Usan rutas fijas de trabajo (`/tmp/claude-0/...`): ajústelas antes de ejecutarlos en otro equipo.

## `demo/` — video de demostración (sin audio)
Graba la aplicación real funcionando en local con Playwright (Chromium) y la edita con ffmpeg.

| Archivo | Para qué |
|---|---|
| `svc.sh` | Levanta backend (Django), frontend (Vite preview), servidor de teselas y pasarela de pago simulada |
| `tileserver.py` | Dibuja teselas del mapa del Maule con datos de Natural Earth (para grabar sin internet) y sirve las fotos |
| `mock-pay.mjs` | Pasarela de pago **simulada** con la misma API que Webpay Plus (rotulada "ambiente de pruebas") |
| `record.mjs` | Recorre la app escena por escena (portada, ingreso, búsqueda, mapa, ficha, reserva, pago, anfitrión) y captura los cuadros |
| `encode.sh` | Codifica cada escena, agrega portada y cierre y une todo |
| `run.sh` / `killsvc.py` | Ejecuta la grabación completa / detiene los servicios |

Credenciales usadas: las de los usuarios demo (`huesped`, `anfitrion`, clave `demo1234`) en una base local desechable.

## `promocional/` — video promocional (50 s, con voz y música)
| Archivo | Para qué |
|---|---|
| `vo.py` | Locución con voz neural Piper `es_AR-daniela-high` (texto del guion, una frase por escena) |
| `music.py` | Música de fondo original sintetizada (sin derechos de terceros) |
| `promo.html` | Animación de las 7 escenas (HTML/CSS/JS, función `render(t)` determinista) |
| `capture.mjs` | Captura la animación cuadro a cuadro a 1920×1080 / 30 fps |

Mezcla final: voz normalizada a −16 LUFS con la música atenuada bajo la voz (ffmpeg `sidechaincompress`).

## `presentacion-build.py`
Une las grabaciones con rostro y voz de los integrantes sobre los tramos de la demostración.
