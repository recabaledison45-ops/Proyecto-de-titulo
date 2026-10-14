import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bed, Compass, Heart, Leaf, Mountain, Package, ShieldCheck, Wallet } from 'lucide-react'
import { searchListings } from '@/api/listings'
import { errorMessage } from '@/api/client'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { DESTINATIONS } from '@/lib/destinations'

const HERO_IMAGE = 'https://picsum.photos/seed/maule-hero/1920/1000'

const CATEGORY_CARDS = [
  { id: 'lodging', label: 'Alojamientos', hint: 'Cabañas y casonas', icon: Bed, from: '#fb7185', to: '#be123c' },
  { id: 'package', label: 'Paquetes', hint: 'Escapadas completas', icon: Package, from: '#fbbf24', to: '#c2410c' },
  { id: 'guide', label: 'Guías locales', hint: 'Rutas con expertos', icon: Compass, from: '#34d399', to: '#047857' },
  { id: 'activity', label: 'Actividades', hint: 'Tours y talleres', icon: Mountain, from: '#38bdf8', to: '#1d4ed8' },
]

const BENEFITS = [
  { icon: Leaf, title: 'Turismo regenerativo', text: 'Experiencias que cuidan el territorio y apoyan a emprendimientos locales del Maule.' },
  { icon: ShieldCheck, title: 'Reserva sin dobles cupos', text: 'Disponibilidad en tiempo real: lo que ves libre, es tuyo.' },
  { icon: Wallet, title: 'Precios claros', text: 'Ves el total antes de reservar. Pagas por transferencia directa al anfitrión.' },
  { icon: Heart, title: 'Reseñas reales', text: 'Solo opinan quienes reservaron, y se publican de forma cruzada y honesta.' },
]

function Row({ title, subtitle, to, items }) {
  if (!items.length) return null
  return (
    <section className="mx-auto max-w-7xl px-4 pt-14" aria-label={title}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} className="hidden items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline sm:flex">
            Ver todo <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </section>
  )
}

export default function Home() {
  usePageTitle('')
  const [listings, setListings] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    searchListings({ page_size: 100 }, controller.signal)
      .then((d) => setListings(d.results))
      .catch((e) => { if (e.code !== 'ERR_CANCELED') setError(errorMessage(e)) })
    return () => controller.abort()
  }, [])

  const { top, adventures, stays, counts } = useMemo(() => {
    const all = listings ?? []
    const byRating = [...all].sort((a, b) => (b.rating_avg ?? -1) - (a.rating_avg ?? -1) || (b.reviews_count ?? 0) - (a.reviews_count ?? 0))
    return {
      top: byRating.slice(0, 4),
      adventures: all.filter((l) => ['activity', 'guide'].includes(l.category)).slice(0, 4),
      stays: all.filter((l) => ['lodging', 'package'].includes(l.category)).slice(0, 4),
      counts: all.reduce((acc, l) => ({ ...acc, [l.category]: (acc[l.category] ?? 0) + 1 }), {}),
    }
  }, [listings])

  return (
    <div>
      {/* Portada */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#ff385c] via-[#d70466] to-[#5b21b6]">
        <img src={HERO_IMAGE} alt="" fetchPriority="high" onError={(e) => { e.currentTarget.style.display = 'none' }}
          className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />
        <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-20 pb-24 text-center text-white sm:pt-28 sm:pb-32">
          <div className="grid gap-4">
            <p className="mx-auto w-fit rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">Región del Maule · Chile</p>
            <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Vive experiencias <span className="text-[#ffd1dc]">inolvidables</span> en el Maule
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-white/90">
              Alojamientos, paquetes, guías locales y actividades de bienestar y naturaleza. Reserva en minutos, directo con anfitriones de la zona.
            </p>
          </div>
          <SearchBar />
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto -mt-10 max-w-7xl px-4" aria-label="Categorías">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORY_CARDS.map(({ id, label, hint, icon: Icon, from, to }) => (
            <Link key={id} to={`/explore?category=${id}`}
              className="group relative flex min-h-28 flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-lg transition-transform hover:-translate-y-1"
              style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>
              <Icon className="size-8 transition-transform group-hover:scale-110" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className="text-lg font-bold">{label}</p>
                <p className="text-sm text-white/85">{counts[id] ? `${counts[id]} disponibles` : hint}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {error && <p role="alert" className="mx-auto mt-10 max-w-3xl rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">{error}</p>}
      {!listings && !error && (
        <div className="mx-auto mt-14 grid max-w-7xl gap-5 px-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Cargando ofertas">
          {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="aspect-[4/3] w-full rounded-2xl" />)}
        </div>
      )}
      {listings && listings.length === 0 && (
        <div className="mx-auto mt-14 max-w-xl rounded-2xl border border-dashed p-10 text-center">
          <p className="font-semibold">Todavía no hay ofertas publicadas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Si eres anfitrión, publica la primera desde tu panel.</p>
        </div>
      )}

      <Row title="Mejor valoradas" subtitle="Lo que más recomiendan quienes ya viajaron" to="/explore" items={top} />

      {/* Destinos */}
      <section className="mx-auto max-w-7xl px-4 pt-14" aria-label="Destinos populares">
        <h2 className="text-2xl font-bold sm:text-3xl">Destinos para inspirarte</h2>
        <p className="mt-1 mb-5 text-muted-foreground">Del mar a la cordillera, todo dentro de la misma región</p>
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
          {DESTINATIONS.map((d) => (
            <Link key={d.id} to={`/explore?dest=${d.id}`}
              className="group relative h-72 w-56 shrink-0 snap-start overflow-hidden rounded-2xl text-white shadow-md sm:w-64"
              style={{ backgroundImage: `linear-gradient(160deg, ${d.from}, ${d.to})` }}>
              <img src={d.image} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-xl font-bold">{d.name}</p>
                <p className="text-sm text-white/90">{d.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Row title="Aventuras y tours" subtitle="Caminatas, kayak, talleres y guías con conocimiento local" to="/explore?category=activity" items={adventures} />
      <Row title="Dónde descansar" subtitle="Cabañas, casonas y escapadas todo incluido" to="/explore?category=lodging" items={stays} />

      {/* Beneficios */}
      <section className="mx-auto max-w-7xl px-4 pt-16" aria-label="Por qué reservar con nosotros">
        <h2 className="mb-6 text-2xl font-bold sm:text-3xl">Por qué reservar aquí</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-card p-6">
              <span className="bg-brand mb-4 flex size-12 items-center justify-center rounded-2xl text-white"><Icon className="size-6" aria-hidden="true" /></span>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Llamado a anfitriones */}
      <section className="mx-auto max-w-7xl px-4 pt-16" aria-label="Conviértete en anfitrión">
        <div className="bg-brand relative overflow-hidden rounded-3xl px-6 py-12 text-white sm:px-14 sm:py-16">
          <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10" aria-hidden="true" />
          <div className="absolute -bottom-24 right-32 size-72 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative grid max-w-2xl gap-4">
            <h2 className="text-3xl font-extrabold sm:text-4xl">¿Tienes un alojamiento, tour o taller en el Maule?</h2>
            <p className="text-lg text-white/90">Publica tu experiencia, gestiona reservas y llega a viajeros de todo Chile. Solo pagas una comisión cuando vendes.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" className="bg-white text-foreground hover:bg-white/90 hover:brightness-100" asChild>
                <Link to="/register?role=host">Quiero ser anfitrión</Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/15" asChild>
                <Link to="/explore">Explorar primero</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
