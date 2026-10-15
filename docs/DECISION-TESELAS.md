# Decisión: proveedor de teselas del mapa (F-69)

**Estado:** decidido · **Fecha:** 14-oct-2026 · **Responsable de revisar:** equipo del proyecto

## Contexto
El mapa (Leaflet) necesita un servidor de teselas. Hasta ahora usaba OpenStreetMap, el servidor público de la Fundación OSM.
Su política de uso (verificada el 14-oct-2026 en <https://operations.osmfoundation.org/policies/tiles/>) dice que el servicio es
*best-effort*, sin SLA ni garantía, que puede **bloquear sin aviso** y que los servicios comerciales o con donaciones "deben esperar que
se les retire el acceso en cualquier momento", remitiendo a proveedores comerciales o a un servidor propio. Exige además atribución
visible, `Referer` válido y respetar la caché. Por lo tanto **no es adecuado como proveedor de producción**.

## Opciones evaluadas (precios verificados el 14-oct-2026 en las páginas oficiales; pueden cambiar)
| Opción | Plan gratuito | Uso comercial | Costo si se supera / paga | Observaciones |
|---|---|---|---|---|
| **MapTiler Cloud** | 100 mil peticiones API/mes, 5 mil sesiones | **No** (plan gratis = pruebas, personal o no comercial; muestra logo) | Flex US$ 30/mes (500 mil peticiones, sin logo) | Clave por dominio; estilos propios; mapas raster y vectoriales |
| Stadia Maps | 200 mil créditos/mes | **No** | Starter US$ 20/mes (1 M de créditos) | Clave o dominio autorizado |
| OSM público | Ilimitado "razonable" | Tolerado sin garantías | — | Sin SLA; riesgo de bloqueo |
| Mapbox / Google | Cuotas gratuitas con tarjeta | Sí (de pago) | Por uso | Mayor costo y bloqueo a un proveedor |
| Servidor propio (OpenMapTiles + PMTiles) | — | Sí | Operación y almacenamiento (~decenas de GB) | Control total; más trabajo operativo |
| Capas Esri / OpenTopoMap (las que usaba el selector de estilos) | Sin contrato para uso en producción | Condicionado | — | Términos propios; no se usan en producción |

## Decisión
1. **Producción: MapTiler Cloud.** Mientras el sitio sea un proyecto de título / piloto sin cobro, el **plan gratuito** alcanza (100 mil
   peticiones/mes ≈ 2.500 visitas con mapa interactivo). **Al iniciar la operación comercial** (el modelo cobra 10 % de comisión),
   pasar al plan **Flex (US$ 30/mes)**: el plan gratis no permite uso comercial.
2. **Desarrollo y pruebas:** OpenStreetMap, solo en equipos de desarrollo y en las pruebas E2E (que además lo simulan).
3. **Capas extra** (relieve, calles, satélite): ocultas en producción. Se pueden habilitar con `VITE_MAP_EXTRA_STYLES=true` solo
   tras revisar sus términos.
4. **Alternativa de contingencia:** Stadia Maps (Starter) — cambiar solo `VITE_TILE_URL` y la atribución, sin tocar código.

## Cómo se configura (sin cambios de código)
1. Crear cuenta en MapTiler Cloud → *API keys* → crear una clave **solo para este sitio** y restringirla por **HTTP referrer** a
   `https://wexperiencias.cl/*` (la clave viaja en el JavaScript y es pública por diseño; la restricción por dominio es la defensa).
2. En `deploy/.env.prod`:
   ```
   VITE_TILE_URL=https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=SU_CLAVE
   VITE_TILE_ATTRIBUTION=&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
   ```
3. `./scripts/deploy.sh` (las variables `VITE_*` se incrustan al compilar el frontend).
4. Verificar en el navegador (pestaña Red) que las teselas vienen de `api.maptiler.com` y que la atribución se ve en el mapa.

El formato 256 px (`/256/{z}/{x}/{y}.png`) es el que Leaflet espera sin ajustes adicionales. Si se prefiere el mapa vectorial de MapTiler,
habría que cambiar a `maplibre-gl` (no se hizo: aumenta el tamaño del paquete y el alcance).

## Consecuencias
- La Política de Seguridad de Contenido (`deploy/nginx/snippets/security-headers.conf`) ya permite imágenes `https:`; no requiere cambios.
- Hay que vigilar la cuota en el panel de MapTiler (alertas de uso) y revisar este documento si cambian sus condiciones.
