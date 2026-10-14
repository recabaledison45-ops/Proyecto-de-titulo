import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { List, Map as MapIcon, X } from 'lucide-react'
import { searchListings } from '@/api/listings'
import { errorMessage } from '@/api/client'
import ListingCard from '@/components/ListingCard'
import { MAULE_CENTER, MAP_STYLES, priceIcon } from '@/components/mapConfig'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { money, todayISO } from '@/lib/format'
import { CATEGORY_OPTIONS, DIFFICULTY_OPTIONS, categoryLabel, priceUnit } from '@/lib/labels'

const ALL = 'all'
const EMPTY = { category: ALL, difficulty: ALL, check_in: '', check_out: '', guests: '' }

// Emite el cuadro visible del mapa (con retardo) al mover o hacer zoom.
function BoundsWatcher({ onChange }) {
  const map = useMap()
  const timer = useRef()
  const emit = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const b = map.getBounds()
      onChange({ lat_min: b.getSouth(), lat_max: b.getNorth(), lng_min: b.getWest(), lng_max: b.getEast() })
    }, 400)
  }, [map, onChange])
  useMapEvents({ moveend: emit })
  useEffect(() => { emit(); return () => clearTimeout(timer.current) }, [emit])
  return null
}

// Leaflet necesita recalcular su tamaño cuando el contenedor vuelve a mostrarse (móvil: alternar mapa/lista).
function Resizer() {
  const map = useMap()
  useEffect(() => {
    let frame
    const resize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(map.getContainer())
    resize()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [map])
  return null
}

export default function Explore() {
  usePageTitle('')
  const [filters, setFilters] = useState(EMPTY)
  const [bounds, setBounds] = useState(null)
  const [results, setResults] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hoverId, setHoverId] = useState(null)
  const [mobileView, setMobileView] = useState('list')
  const [mapStyle, setMapStyle] = useState(MAP_STYLES[0])

  const datesInvalid = filters.check_in && filters.check_out && filters.check_out <= filters.check_in
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const selectMapStyle = (id) => {
    const style = MAP_STYLES.find((option) => option.id === id)
    if (style) setMapStyle(style)
  }

  useEffect(() => {
    if (!bounds) return
    const controller = new AbortController()
    const params = {
      ...bounds,
      category: filters.category === ALL ? '' : filters.category,
      difficulty: filters.difficulty === ALL ? '' : filters.difficulty,
      guests: filters.guests,
      check_in: datesInvalid ? '' : filters.check_in,
      check_out: datesInvalid ? '' : filters.check_out,
    }
    // Solo se envían fechas cuando están ambas.
    if (!params.check_in || !params.check_out) { params.check_in = ''; params.check_out = '' }
    searchListings(params, controller.signal)
      .then((data) => { setResults(data.results); setCount(data.count); setError('') })
      .catch((e) => { if (e.code !== 'ERR_CANCELED') setError(errorMessage(e)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [bounds, filters, datesInvalid])

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY)

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <section aria-label="Filtros" className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-3">
          <div className="grid w-44 gap-1">
            <Label htmlFor="f-cat">Categoría</Label>
            <Select value={filters.category} onValueChange={(v) => set({ category: v })}>
              <SelectTrigger id="f-cat"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-in">Llegada</Label>
            <Input id="f-in" type="date" min={todayISO()} value={filters.check_in} onChange={(e) => set({ check_in: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-out">Salida</Label>
            <Input id="f-out" type="date" min={filters.check_in || todayISO()} value={filters.check_out}
              aria-invalid={Boolean(datesInvalid)} onChange={(e) => set({ check_out: e.target.value })} />
          </div>
          <div className="grid w-24 gap-1">
            <Label htmlFor="f-guests">Personas</Label>
            <Input id="f-guests" type="number" min={1} max={50} value={filters.guests} onChange={(e) => set({ guests: e.target.value })} />
          </div>
          <div className="grid w-36 gap-1">
            <Label htmlFor="f-diff">Dificultad</Label>
            <Select value={filters.difficulty} onValueChange={(v) => set({ difficulty: v })}>
              <SelectTrigger id="f-diff"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Cualquiera</SelectItem>
                {DIFFICULTY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY)}><X /> Limpiar</Button>}
          {datesInvalid && <p role="alert" className="text-xs text-destructive">La salida debe ser posterior a la llegada.</p>}
        </div>
      </section>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <section aria-label="Resultados" className={`min-h-0 w-full overflow-y-auto p-4 lg:block lg:w-[480px] lg:shrink-0 ${mobileView === 'list' ? 'block flex-1' : 'hidden'}`}>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {loading ? 'Buscando…' : `${count} ${count === 1 ? 'oferta' : 'ofertas'} en la zona visible del mapa`}
          </p>
          {error && <p role="alert" className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="grid gap-3">
            {loading && [1, 2, 3].map((n) => <Skeleton key={n} className="h-28 w-full" />)}
            {!loading && results.map((l) => <ListingCard key={l.id} listing={l} active={hoverId === l.id} onHover={setHoverId} />)}
            {!loading && !results.length && !error && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No hay ofertas con estos filtros en esta zona. Prueba alejar el mapa o limpiar los filtros.
              </div>
            )}
          </div>
        </section>

        <section aria-label="Mapa" className={`relative min-h-0 flex-1 lg:block ${mobileView === 'map' ? 'block' : 'hidden'}`}>
          <div className="absolute right-3 top-3 z-[1000] w-48 rounded-md bg-card/95 p-2 shadow-lg backdrop-blur">
            <Label htmlFor="map-style" className="mb-1 block text-xs">Estilo del mapa</Label>
            <Select value={mapStyle.id} onValueChange={selectMapStyle}>
              <SelectTrigger id="map-style" className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAP_STYLES.map((style) => <SelectItem key={style.id} value={style.id}>{style.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <MapContainer center={MAULE_CENTER} zoom={8} className="h-full w-full" scrollWheelZoom>
            <TileLayer key={mapStyle.id} url={mapStyle.url} attribution={mapStyle.attribution} />
            <BoundsWatcher onChange={setBounds} />
            <Resizer />
            {results.map((l) => (
              <Marker key={l.id} position={[l.latitude, l.longitude]} icon={priceIcon(l.price_per_night, hoverId === l.id)}
                eventHandlers={{ mouseover: () => setHoverId(l.id), mouseout: () => setHoverId(null) }}>
                <Popup>
                  <div className="grid gap-1 text-sm">
                    <strong className="font-serif text-base">{l.title}</strong>
                    <span>{categoryLabel(l.category)} · {l.city}</span>
                    <span>{money(l.price_per_night)} {priceUnit(l)}</span>
                    <Link to={`/listings/${l.id}`} className="font-medium text-primary underline">Ver detalle</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>

        <Button className="absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 shadow-lg lg:hidden"
          onClick={() => setMobileView((v) => (v === 'list' ? 'map' : 'list'))}>
          {mobileView === 'list' ? <><MapIcon /> Ver mapa</> : <><List /> Ver lista</>}
        </Button>
      </div>
    </div>
  )
}
