import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { ChevronLeft, Clock, Mountain, Share2, Shirt, Sparkles, Tag, Users } from 'lucide-react'
import { toast } from 'sonner'
import { bookedDates, getListing } from '@/api/listings'
import { listReviews } from '@/api/reviews'
import BookingWidget from '@/components/BookingWidget'
import FavoriteButton from '@/components/FavoriteButton'
import ListingImage from '@/components/ListingImage'
import { TILE_ATTRIBUTION, TILE_URL, priceIcon } from '@/components/mapConfig'
import { StarDisplay } from '@/components/Stars'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { fmtDate, money } from '@/lib/format'
import { DIFFICULTY, categoryLabel, priceUnit } from '@/lib/labels'

const Avatar = ({ name, className = 'size-12 text-lg' }) => (
  <span className={`bg-brand flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`} aria-hidden="true">
    {(name || '?').slice(0, 1).toUpperCase()}
  </span>
)

function Fact({ icon: Icon, label, children }) {
  return (
    <li className="flex items-start gap-4">
      <Icon className="mt-0.5 size-6 shrink-0" aria-hidden="true" strokeWidth={1.75} />
      <div><p className="font-semibold">{label}</p><p className="text-sm text-muted-foreground">{children}</p></div>
    </li>
  )
}

export default function ListingDetail() {
  const { id } = useParams()
  return <ListingDetailView key={id} id={id} />
}

function ListingDetailView({ id }) {
  const [listing, setListing] = useState(null)
  const [booked, setBooked] = useState(null)
  const [reviews, setReviews] = useState([])
  const [state, setState] = useState('loading')
  usePageTitle(listing?.title, { description: listing?.description || undefined })

  const loadBooked = useCallback(() => bookedDates(id).then(setBooked).catch(() => {}), [id])

  useEffect(() => {
    let alive = true
    Promise.all([getListing(id), bookedDates(id), listReviews(id)])
      .then(([l, b, r]) => { if (alive) { setListing(l); setBooked(b); setReviews(r); setState('ready') } })
      .catch((e) => { if (alive) setState(e.response?.status === 404 ? 'missing' : 'error') })
    return () => { alive = false }
  }, [id])

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url })
      else { await navigator.clipboard.writeText(url); toast.success('Enlace copiado') }
    } catch { /* el usuario canceló */ }
  }

  if (state === 'loading') {
    return <div className="mx-auto max-w-6xl space-y-4 p-6"><Skeleton className="h-96 w-full rounded-3xl" /><Skeleton className="h-8 w-1/2" /></div>
  }
  if (state !== 'ready') {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-2xl font-bold">{state === 'missing' ? 'Esta oferta no existe o ya no está disponible' : 'No pudimos cargar la oferta'}</h1>
        <Button className="mt-4" asChild><Link to="/explore">Volver a explorar</Link></Button>
      </div>
    )
  }

  const hasSheet = listing.duration_hours || listing.difficulty || listing.dress_code || listing.wellness_benefits
  const rated = listing.rating_avg != null

  return (
    <article className="mx-auto max-w-6xl px-4 pt-5 pb-28 lg:pb-10">
      <Link to="/explore" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"><ChevronLeft className="size-4" /> Volver a explorar</Link>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-2">
          <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">{listing.title}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {rated ? (
              <><StarDisplay value={listing.rating_avg} /><span className="font-semibold">{listing.rating_avg}</span><span className="text-muted-foreground">({listing.reviews_count} reseñas)</span></>
            ) : <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">Nuevo</span>}
            <span aria-hidden="true">·</span>
            <span className="font-semibold underline">{listing.city}</span>
            <span aria-hidden="true">·</span>
            <span>{categoryLabel(listing.category)}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={share} className="flex items-center gap-1.5 text-sm font-semibold underline"><Share2 className="size-4" /> Compartir</button>
          <FavoriteButton id={listing.id} label variant="plain" />
        </div>
      </header>

      <ListingImage src={listing.image_url} category={listing.category} alt={listing.title} eager
        className="aspect-[16/9] max-h-[30rem] w-full rounded-3xl sm:aspect-[21/9]" />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_390px]">
        <div className="grid min-w-0 content-start gap-8">
          <section className="flex items-center justify-between gap-4 border-b pb-8" aria-label="Anfitrión">
            <div>
              <h2 className="text-xl font-bold">{categoryLabel(listing.category)} a cargo de {listing.host.display_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hasta {listing.max_guests} personas · {listing.booking_mode === 'shared' ? 'actividad grupal con cupos por fecha' : 'reserva exclusiva por fecha'}
              </p>
            </div>
            <Avatar name={listing.host.display_name} />
          </section>

          {hasSheet && (
            <section aria-labelledby="ficha" className="border-b pb-8">
              <h2 id="ficha" className="mb-5 text-xl font-bold">Lo que debes saber</h2>
              <ul className="grid gap-5 sm:grid-cols-2">
                <Fact icon={Users} label="Capacidad">{listing.max_guests} personas como máximo</Fact>
                {listing.duration_hours && <Fact icon={Clock} label="Duración">{Number(listing.duration_hours)} horas</Fact>}
                {listing.difficulty && <Fact icon={Mountain} label="Dificultad">{DIFFICULTY[listing.difficulty]}</Fact>}
                <Fact icon={Tag} label="Precio">{money(listing.price_per_night)} {priceUnit(listing)}</Fact>
                {listing.dress_code && <Fact icon={Shirt} label="Qué llevar">{listing.dress_code}</Fact>}
                {listing.wellness_benefits && <Fact icon={Sparkles} label="Beneficios de bienestar">{listing.wellness_benefits}</Fact>}
              </ul>
            </section>
          )}

          {listing.description && (
            <section aria-labelledby="acerca" className="border-b pb-8">
              <h2 id="acerca" className="mb-3 text-xl font-bold">Acerca de esta experiencia</h2>
              <p className="max-w-prose leading-relaxed whitespace-pre-line">{listing.description}</p>
            </section>
          )}

          <section aria-labelledby="anfitrion" className="border-b pb-8">
            <h2 id="anfitrion" className="mb-4 text-xl font-bold">Conoce a tu anfitrión</h2>
            <div className="flex items-start gap-4 rounded-3xl bg-secondary p-6">
              <Avatar name={listing.host.display_name} className="size-16 text-2xl" />
              <div>
                <p className="text-lg font-bold">{listing.host.display_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{listing.host.bio || 'Anfitrión local de la Región del Maule.'}</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="resenas" className="border-b pb-8">
            <h2 id="resenas" className="mb-4 flex items-center gap-2 text-xl font-bold">
              {rated ? <>{listing.rating_avg} <StarDisplay value={listing.rating_avg} className="[&_span]:size-4" /> · {listing.reviews_count} reseñas</> : 'Reseñas'}
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay reseñas publicadas. Se publican cuando huésped y anfitrión reseñan la misma reserva.</p>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2">
                {reviews.map((r) => (
                  <li key={r.id} className="grid gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.author_name} className="size-11 text-base" />
                      <div>
                        <p className="font-semibold">{r.author_name}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                      </div>
                    </div>
                    <StarDisplay value={r.rating} />
                    {r.comment && <p className="text-sm leading-relaxed">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="ubicacion">
            <h2 id="ubicacion" className="mb-1 text-xl font-bold">Dónde estarás</h2>
            <p className="mb-4 text-sm text-muted-foreground">{listing.city}{listing.address ? ` · ${listing.address}` : ''}</p>
            <div className="h-80 overflow-hidden rounded-3xl border">
              <MapContainer center={[listing.latitude, listing.longitude]} zoom={11} className="h-full w-full" scrollWheelZoom={false}>
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                <Marker position={[listing.latitude, listing.longitude]} icon={priceIcon(listing.price_per_night, true)} />
              </MapContainer>
            </div>
          </section>
        </div>

        <aside aria-label="Reservar" className="min-w-0">
          <BookingWidget listing={listing} booked={booked} onBooked={loadBooked} />
        </aside>
      </div>

      {/* Barra fija en móvil */}
      <div className="fixed inset-x-0 bottom-0 z-[900] flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="leading-tight"><span className="text-lg font-extrabold">{money(listing.price_per_night)}</span><br /><span className="text-xs text-muted-foreground">{priceUnit(listing)}</span></p>
        <Button size="lg" onClick={() => document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Ver disponibilidad</Button>
      </div>
    </article>
  )
}
