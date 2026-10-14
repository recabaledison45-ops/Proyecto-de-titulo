import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Bed, Compass, LayoutGrid, List, Map as MapIcon, Mountain, Package, Search, X } from 'lucide-react'
import { searchListings } from '@/api/listings'
import { errorMessage } from '@/api/client'
import ListingCard from '@/components/ListingCard'
import { MAP_STYLES, priceIcon } from '@/components/mapConfig'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { DESTINATIONS, MAULE_CENTER, MAULE_ZOOM, findDestination } from '@/lib/destinations'
import { money, todayISO } from '@/lib/format'
import { DIFFICULTY_OPTIONS, categoryLabel, priceUnit } from '@/lib/labels'
import { cn } from '@/lib/utils'

const ALL = 'all'
const FILTER_KEYS = ['q', 'category', 'difficulty', 'check_in', 'check_out', 'guests', 'dest']
const CHIPS = [
  { value: ALL, label: 'Todo', icon: LayoutGrid },
  { value: 'lodging', label: 'Alojamientos', icon: Bed },
  { value: 'package', label: 'Paquetes', icon: Package },
  { value: 'guide', label: 'Guías', icon: Compass },
  { value: 'activity', label: 'Actividades', icon: Mountain },
]

// Emite el cuadro visible del mapa (con retardo) al mover o hacer zoom.
function BoundsWatcher({ onChange }) {
  const map = useMap()
  const timer = useRef()
  const emit = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      // Mapa oculto (móvil, vista de lista): sin tamaño no hay "zona visible"; se busca en toda la región.
      if (!map.getSize().x || !map.getSize().y) return onChange({})
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
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [map])
  return null
}

// Vuela al destino elegido (solo cuando cambia; con el mapa oculto en móvil se reposiciona sin animar).
function FlyToDestination({ dest }) {
  const map = useMap()
  const previous = useRef(dest)
  useEffect(() => {
    if (previous.current === dest) return
    previous.current = dest
    const d = findDestination(dest)
    const center = d ? d.center : MAULE_CENTER
    const zoom = d ? d.zoom : MAULE_ZOOM
    const size = map.getSize()
    if (size.x && size.y) map.flyTo(center, zoom, { duration: 0.8 })
    else map.setView(center, zoom, { animate: false })
  }, [dest, map])
  return null
}

// Con búsqueda de texto no se limita al cuadro visible: el mapa se ajusta a los resultados.
function FitResults({ results, active }) {
  const map = useMap()
  const key = results.map((r) => r.id).join(',')
  useEffect(() => {
    if (!active || !results.length) return
    const points = results.map((r) => [r.latitude, r.longitude])
    map.fitBounds(points, { padding: [60, 60], maxZoom: 12, animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, map])
  return null
}

export default function Explore() {
  usePageTitle('Explorar')
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => ({
    q: params.get('q') ?? '',
    category: params.get('category') ?? ALL,
    difficulty: params.get('difficulty') ?? ALL,
    check_in: params.get('check_in') ?? '',
    check_out: params.get('check_out') ?? '',
    guests: params.get('guests') ?? '',
    dest: params.get('dest') ?? ALL,
  }), [params])

  const [qDraft, setQDraft] = useState(filters.q)
  const [bounds, setBounds] = useState(null)
  const [results, setResults] = useState([])
  const [count, setCount] = useState(0)
  const [doneKey, setDoneKey] = useState('')
  const [error, setError] = useState('')
  const [hoverId, setHoverId] = useState(null)
  const [mobileView, setMobileView] = useState('list')
  const [mapStyle, setMapStyle] = useState(MAP_STYLES[0])

  const datesInvalid = filters.check_in && filters.check_out && filters.check_out <= filters.check_in
  const textMode = Boolean(filters.q.trim())

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v == null || v === ALL) next.delete(k)
      else next.set(k, v)
    })
    setParams(next, { replace: true })
  }
  const clear = () => { setQDraft(''); setParams(new URLSearchParams(), { replace: true }) }

  // Si la URL cambia desde fuera (p. ej. enlace del pie de página), se sincroniza el campo de texto.
  const [syncedQ, setSyncedQ] = useState(filters.q)
  if (syncedQ !== filters.q) { setSyncedQ(filters.q); setQDraft(filters.q) }

  // Centro y zoom iniciales: el destino de la URL o toda la región.
  const [initialView] = useState(() => {
    const d = findDestination(params.get('dest'))
    return d ? { center: d.center, zoom: d.zoom } : { center: MAULE_CENTER, zoom: MAULE_ZOOM }
  })

  const ready = Boolean(bounds) || textMode
  const query = useMemo(() => {
    const q = {
      q: filters.q.trim(),
      category: filters.category === ALL ? '' : filters.category,
      difficulty: filters.difficulty === ALL ? '' : filters.difficulty,
      guests: filters.guests,
      check_in: datesInvalid ? '' : filters.check_in,
      check_out: datesInvalid ? '' : filters.check_out,
      ...(textMode ? {} : bounds),
    }
    // Solo se envían fechas cuando están ambas.
    if (!q.check_in || !q.check_out) { q.check_in = ''; q.check_out = '' }
    return q
  }, [bounds, filters, datesInvalid, textMode])
  const queryKey = JSON.stringify(query)
  const loading = !ready || doneKey !== queryKey

  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    searchListings(query, controller.signal)
      .then((data) => { setResults(data.results); setCount(data.count); setError(''); setDoneKey(queryKey) })
      .catch((e) => { if (e.code !== 'ERR_CANCELED') { setError(errorMessage(e)); setDoneKey(queryKey) } })
    return () => controller.abort()
  }, [ready, query, queryKey])

  const hasFilters = FILTER_KEYS.some((k) => params.has(k))

  return (
    <div className="flex h-[calc(100dvh-4.5rem)] flex-col">
      <section aria-label="Filtros" className="border-b bg-background">
        {/* Categorías */}
        <div className="no-scrollbar mx-auto flex max-w-[1800px] gap-2 overflow-x-auto px-4 pt-3" role="tablist" aria-label="Categoría">
          {CHIPS.map(({ value, label, icon: Icon }) => {
            const active = filters.category === value
            return (
              <button key={value} type="button" role="tab" aria-selected={active} onClick={() => set({ category: value })}
                className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  active ? 'border-foreground bg-foreground text-background' : 'bg-card hover:border-foreground')}>
                <Icon className="size-4" aria-hidden="true" />{label}
              </button>
            )
          })}
        </div>
        {/* Resto de filtros */}
        <form className="mx-auto flex max-w-[1800px] flex-wrap items-end gap-3 px-4 py-3"
          onSubmit={(e) => { e.preventDefault(); set({ q: qDraft.trim() }) }}>
          <div className="grid min-w-52 flex-1 gap-1 sm:max-w-xs">
            <Label htmlFor="f-q">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="f-q" type="search" className="pl-9" placeholder="Lugar, nombre o actividad" value={qDraft} maxLength={100}
                onChange={(e) => setQDraft(e.target.value)} onBlur={() => { if (qDraft.trim() !== filters.q) set({ q: qDraft.trim() }) }} />
            </div>
          </div>
          <div className="grid w-44 gap-1">
            <Label htmlFor="f-dest">Destino</Label>
            <Select value={filters.dest} onValueChange={(v) => set({ dest: v, q: '' })}>
              <SelectTrigger id="f-dest"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todo el Maule</SelectItem>
                {DESTINATIONS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
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
          {hasFilters && <Button type="button" variant="ghost" size="sm" onClick={clear}><X /> Limpiar</Button>}
          {datesInvalid && <p role="alert" className="text-xs text-destructive">La salida debe ser posterior a la llegada.</p>}
        </form>
      </section>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <section aria-label="Resultados"
          className={cn('min-h-0 w-full overflow-y-auto p-4 lg:block lg:w-[min(48vw,760px)] lg:shrink-0', mobileView === 'list' ? 'block flex-1' : 'hidden')}>
          <p className="mb-4 text-sm font-medium" aria-live="polite">
            {loading ? 'Buscando…' : `${count} ${count === 1 ? 'resultado' : 'resultados'}${textMode || bounds?.lat_min == null ? '' : ' en la zona visible del mapa'}`}
          </p>
          {error && <p role="alert" className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
            {loading && !results.length && [1, 2, 3, 4].map((n) => <Skeleton key={n} className="aspect-[4/3] w-full rounded-2xl" />)}
            {results.map((l) => <ListingCard key={l.id} listing={l} active={hoverId === l.id} onHover={setHoverId} />)}
          </div>
          {!loading && !results.length && !error && (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="font-semibold">No encontramos ofertas con estos filtros.</p>
              <p className="mt-1 text-sm text-muted-foreground">Prueba alejar el mapa, cambiar las fechas o limpiar los filtros.</p>
              {hasFilters && <Button className="mt-4" variant="outline" onClick={clear}>Limpiar filtros</Button>}
            </div>
          )}
        </section>

        <section aria-label="Mapa" className={cn('relative min-h-0 flex-1 lg:block', mobileView === 'map' ? 'block' : 'hidden')}>
          <div className="absolute top-3 right-3 z-[1000] w-44 rounded-xl bg-card/95 p-2 shadow-lg backdrop-blur">
            <Label htmlFor="map-style" className="mb-1 block text-xs">Estilo del mapa</Label>
            <Select value={mapStyle.id} onValueChange={(id) => setMapStyle(MAP_STYLES.find((s) => s.id === id) ?? MAP_STYLES[0])}>
              <SelectTrigger id="map-style" className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAP_STYLES.map((style) => <SelectItem key={style.id} value={style.id}>{style.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <MapContainer center={initialView.center} zoom={initialView.zoom} className="h-full w-full" scrollWheelZoom>
            <TileLayer key={mapStyle.id} url={mapStyle.url} attribution={mapStyle.attribution} />
            <BoundsWatcher onChange={setBounds} />
            <Resizer />
            <FlyToDestination dest={filters.dest} />
            <FitResults results={results} active={textMode} />
            {results.map((l) => (
              <Marker key={l.id} position={[l.latitude, l.longitude]} icon={priceIcon(l.price_per_night, hoverId === l.id)}
                eventHandlers={{ mouseover: () => setHoverId(l.id), mouseout: () => setHoverId(null) }}>
                <Popup>
                  <div className="grid gap-1 text-sm">
                    <strong className="text-base">{l.title}</strong>
                    <span className="text-muted-foreground">{categoryLabel(l.category)} · {l.city}</span>
                    <span className="font-semibold">{money(l.price_per_night)} <span className="font-normal text-muted-foreground">{priceUnit(l)}</span></span>
                    <Link to={`/listings/${l.id}`} className="font-semibold text-primary underline">Ver detalle</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>

        <Button variant="dark" size="lg" className="absolute bottom-5 left-1/2 z-[500] -translate-x-1/2 rounded-full shadow-xl lg:hidden"
          onClick={() => setMobileView((v) => (v === 'list' ? 'map' : 'list'))}>
          {mobileView === 'list' ? <><MapIcon /> Mapa</> : <><List /> Lista</>}
        </Button>
      </div>
    </div>
  )
}
