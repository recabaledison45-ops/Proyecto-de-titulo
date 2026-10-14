import L from 'leaflet'
export { MAULE_CENTER } from '@/lib/destinations'
import { moneyShort } from '@/lib/format'

// Teselas configurables por entorno. Por defecto OpenStreetMap (gratis, sin clave; respeta su política de uso y atribución).
export const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export const MAP_STYLES = [
  { id: 'osm', label: 'Claro', url: TILE_URL, attribution: TILE_ATTRIBUTION },
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
