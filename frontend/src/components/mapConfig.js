import L from 'leaflet'
export { MAULE_CENTER } from '@/lib/destinations'
import { moneyShort } from '@/lib/format'

// ---------------------------------------------------------------------------
// Proveedor de teselas (decisión F-69, ver docs/DECISION-TESELAS.md)
//   · Producción: un proveedor comercial con clave (recomendado: MapTiler) definido con
//     VITE_TILE_URL + VITE_TILE_ATTRIBUTION. La clave es pública por diseño: restrínjala por dominio
//     (HTTP referrer) en el panel del proveedor.
//   · Desarrollo y pruebas: si no hay VITE_TILE_URL se usa OpenStreetMap (sin clave; su política lo
//     limita a un uso moderado y sin garantía de servicio, por eso NO es la opción de producción).
//   · Las capas gratuitas extra (relieve, calles, satélite) no tienen contrato para producción; solo se
//     ofrecen en desarrollo o si se define VITE_MAP_EXTRA_STYLES=true.
// ---------------------------------------------------------------------------
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export const TILE_URL = import.meta.env.VITE_TILE_URL || OSM_URL
export const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION || OSM_ATTRIBUTION

const BASE_STYLE = {
  id: 'base',
  label: import.meta.env.VITE_TILE_URL ? 'Mapa' : 'Claro',
  url: TILE_URL,
  attribution: TILE_ATTRIBUTION,
}

const EXTRA_STYLES = [
  {
    id: 'terrain',
    label: 'Relieve',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
  },
  {
    id: 'streets',
    label: 'Calles',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Sources: Esri, HERE, Garmin, FAO, NOAA, USGS, and the GIS User Community',
  },
  {
    id: 'topographic',
    label: 'Topográfico',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Sources: Esri, USGS, NOAA',
  },
  {
    id: 'satellite',
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
]

const showExtras = import.meta.env.DEV || import.meta.env.VITE_MAP_EXTRA_STYLES === 'true'
export const MAP_STYLES = showExtras ? [BASE_STYLE, ...EXTRA_STYLES] : [BASE_STYLE]

const cache = new Map()
export function priceIcon(price, active) {
  const key = `${price}-${active}`
  if (!cache.has(key)) {
    cache.set(key, L.divIcon({
      className: `price-pin${active ? ' active' : ''}`,
      html: `<span>${moneyShort(price)}</span>`,
      iconSize: [0, 0],
    }))
  }
  return cache.get(key)
}

export const pickIcon = L.divIcon({ className: 'pick-pin', html: '<span></span>', iconSize: [0, 0] })
