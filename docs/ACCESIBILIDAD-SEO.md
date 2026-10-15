# Accesibilidad y SEO básico (F-63)

## Accesibilidad (objetivo: WCAG 2.1 nivel AA)
### Automatizado (en cada commit)
`e2e/tests/a11y.spec.js` ejecuta **axe-core** con las reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` sobre: portada, explorar,
detalle de oferta, ingresar, crear cuenta y panel del anfitrión. **Cualquier infracción de gravedad *serious* o *critical* hace fallar el CI.**
También se comprueba que el buscador se opera solo con teclado.

Hallazgos de la primera ejecución, ya corregidos:
| Regla de axe | Dónde | Corrección |
|---|---|---|
| `definition-list`, `dlitem` | "Lo que debes saber" en la ficha de la oferta | Lista `<ul>`/`<li>` en lugar de `<dl>` mal anidada |
| `aria-hidden-focus` | Panel decorativo de ingreso y registro | El logotipo del panel ya no es un enlace enfocable (el enlace a inicio sigue en la cabecera) |

### Revisión manual (lista de comprobación para la UAT; axe no cubre esto)
- [ ] Recorrer portada → buscar → reservar → pagar **solo con teclado** (Tab, Shift+Tab, Enter, Esc); el foco siempre es visible y no queda atrapado.
- [ ] Los diálogos (pagar, reseñar, rechazar) devuelven el foco al botón que los abrió y se cierran con Esc.
- [ ] Con lector de pantalla (NVDA en Windows o VoiceOver en iPhone): las tarjetas se anuncian con título y precio; los errores de formulario se leen.
- [ ] El mapa: toda la información de los pines está también en la lista (alternativa textual); probar sin usar el ratón.
- [ ] Zoom del navegador al 200 % y texto agrandado: nada se corta ni se superpone.
- [ ] Contraste de colores en todos los estados (hover, deshabilitado, error). axe revisa los visibles en carga, no todos los estados.
- [ ] `prefers-reduced-motion` respetado (ya implementado en `index.css`).
- [ ] Colores no son el único medio de comunicar estado (las reservas muestran texto además de color).

## SEO básico
| Elemento | Estado |
|---|---|
| `<html lang="es">`, `<title>` y `meta description` únicos por página | Sí (`usePageTitle`; prueba `seo.spec.js`) |
| Un solo `<h1>` por página | Sí (prueba automática) |
| `<link rel="canonical">` por página | Sí, dinámico |
| `robots` `noindex` en páginas privadas (ingresar, registro, cuenta, reservas, favoritos, 404) | Sí |
| `robots.txt` y `sitemap.xml` con el dominio real | Se generan al compilar con `SITE_URL` (en AWS: `https://<DOMAIN>`); `Disallow` de rutas privadas |
| Open Graph / Twitter Card (título, descripción, tipo) | Sí; **falta imagen `og:image`** (pendiente de la clienta: una foto 1200×630) |
| Imágenes con `alt` | Sí (prueba automática en la portada) |
| `viewport`, `theme-color`, favicon | Sí |
| HTTPS + HSTS + compresión gzip + caché de `assets/` por 1 año | Sí (Nginx) |

### Limitaciones y siguientes pasos (decisiones honestas)
- Es una **SPA que se renderiza en el navegador**: Google la indexa, pero otros buscadores y las vistas previas de redes sociales (WhatsApp, Facebook)
  leen solo el HTML inicial, que es el mismo para todas las páginas. Para vistas previas por oferta se necesita prerenderizado o SSR (fuera del alcance del MVP).
- El `sitemap.xml` lista solo las páginas estáticas; las ofertas (`/listings/:id`) no están incluidas. Se puede generar desde la API en un paso futuro.
- No se midió **Lighthouse/Core Web Vitals** en el entorno de desarrollo. Al desplegar: `npx lighthouse https://<dominio> --view` o PageSpeed Insights,
  y registrar aquí rendimiento, accesibilidad y SEO (meta: ≥ 90 en accesibilidad y SEO).

| Fecha | URL | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|---|
| | / | | | | |
| | /explore | | | | |
