import L from 'leaflet'
import { moneyShort } from '@/lib/format'

// Teselas configurables por entorno (revisar términos de uso del proveedor antes de producción).
export const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ||
  'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'

export const MAP_STYLES = [
  { id: 'terrain', label: 'Relieve', url: TILE_URL, attribution: TILE_ATTRIBUTION },
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

export const MAULE_CENTER = [-35.45, -72.0]

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
