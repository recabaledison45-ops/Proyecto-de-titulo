import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { Clock, Mountain, Shirt, Sparkles } from 'lucide-react'
import { bookedDates, getListing } from '@/api/listings'
import { listReviews } from '@/api/reviews'
import BookingWidget from '@/components/BookingWidget'
import { TILE_ATTRIBUTION, TILE_URL, priceIcon } from '@/components/mapConfig'
import { StarDisplay } from '@/components/Stars'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { fmtDate } from '@/lib/format'
import { DIFFICULTY, categoryLabel } from '@/lib/labels'

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm">{children}</dd></div>
    </div>
  )
}

export default function ListingDetail() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [booked, setBooked] = useState(null)
  const [reviews, setReviews] = useState([])
  const [state, setState] = useState('loading')
  usePageTitle(listing?.title)

  const loadBooked = useCallback(() => bookedDates(id).then(setBooked).catch(() => {}), [id])

  useEffect(() => {
    let alive = true
    Promise.all([getListing(id), bookedDates(id), listReviews(id)])
      .then(([l, b, r]) => { if (alive) { setListing(l); setBooked(b); setReviews(r); setState('ready') } })
      .catch((e) => { if (alive) setState(e.response?.status === 404 ? 'missing' : 'error') })
    return () => { alive = false }
  }, [id])

  if (state === 'loading') {
    return <div className="mx-auto max-w-6xl space-y-4 p-6"><Skeleton className="h-72 w-full" /><Skeleton className="h-8 w-1/2" /></div>
  }
  if (state !== 'ready') {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-2xl font-semibold">{state === 'missing' ? 'Esta oferta no existe o ya no está disponible' : 'No pudimos cargar la oferta'}</h1>
        <Button className="mt-4" asChild><Link to="/">Volver a explorar</Link></Button>
      </div>
    )
  }

  const hasSheet = listing.duration_hours || listing.difficulty || listing.dress_code || listing.wellness_benefits

  return (
    <article className="mx-auto max-w-6xl px-4 py-6">
      <div className="aspect-[16/6] max-h-[26rem] w-full overflow-hidden rounded-xl bg-muted">
        {listing.image_url && <img src={listing.image_url} alt={listing.title} className="h-full w-full object-cover" />}
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-8">
          <header className="grid gap-2">
            <Badge variant="secondary" className="w-fit">{categoryLabel(listing.category)}</Badge>
            <h1 className="text-3xl font-semibold sm:text-4xl">{listing.title}</h1>
            <p className="text-muted-foreground">{listing.city}{listing.address ? ` · ${listing.address}` : ''}</p>
            {listing.rating_avg != null && (
              <p className="flex items-center gap-2 text-sm"><StarDisplay value={listing.rating_avg} /> {listing.rating_avg} · {listing.reviews_count} reseña(s)</p>
            )}
          </header>

          {listing.description && <p className="max-w-prose leading-relaxed whitespace-pre-line">{listing.description}</p>}

          {hasSheet && (
            <section aria-labelledby="ficha">
              <h2 id="ficha" className="mb-3 text-xl font-semibold">Ficha técnica</h2>
              <dl className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
                {listing.duration_hours && <Fact icon={Clock} label="Duración">{Number(listing.duration_hours)} horas</Fact>}
                {listing.difficulty && <Fact icon={Mountain} label="Dificultad">{DIFFICULTY[listing.difficulty]}</Fact>}
                {listing.dress_code && <Fact icon={Shirt} label="Vestimenta recomendada">{listing.dress_code}</Fact>}
                {listing.wellness_benefits && <Fact icon={Sparkles} label="Beneficios de bienestar">{listing.wellness_benefits}</Fact>}
              </dl>
            </section>
          )}

          <section aria-labelledby="anfitrion">
            <h2 id="anfitrion" className="mb-3 text-xl font-semibold">Anfitrión</h2>
            <Card>
              <CardHeader><CardTitle>{listing.host.display_name}</CardTitle></CardHeader>
              {listing.host.bio && <CardContent className="text-sm text-muted-foreground">{listing.host.bio}</CardContent>}
            </Card>
          </section>

          <section aria-labelledby="ubicacion">
            <h2 id="ubicacion" className="mb-3 text-xl font-semibold">Ubicación</h2>
            <div className="h-64 overflow-hidden rounded-xl border">
              <MapContainer center={[listing.latitude, listing.longitude]} zoom={11} className="h-full w-full" scrollWheelZoom={false}>
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                <Marker position={[listing.latitude, listing.longitude]} icon={priceIcon(listing.price_per_night, true)} />
              </MapContainer>
            </div>
          </section>

          <section aria-labelledby="resenas">
            <h2 id="resenas" className="mb-3 text-xl font-semibold">Reseñas</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay reseñas publicadas. Se publican cuando huésped y anfitrión reseñan la misma reserva.</p>
            ) : (
              <ul className="grid gap-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{r.author_name}</strong>
                      <StarDisplay value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside aria-label="Reservar">
          <BookingWidget listing={listing} booked={booked} onBooked={loadBooked} />
        </aside>
      </div>
    </article>
  )
}
