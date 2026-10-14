import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deactivateListing, myListings } from '@/api/listings'
import { errorMessage } from '@/api/client'
import ConfirmAction from '@/components/ConfirmAction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { money } from '@/lib/format'
import { categoryLabel, priceUnit } from '@/lib/labels'

export default function MyListings({ onEdit }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const load = () => myListings().then(setItems).catch((e) => setError(errorMessage(e)))
  useEffect(() => { load() }, [])

  if (error) return <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
  if (!items) return <Skeleton className="h-40 w-full" />
  if (!items.length) return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aún no has publicado ofertas.</p>

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((l) => (
        <Card key={l.id} className="flex-row items-center gap-4 p-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {l.image_url && <img src={l.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
          </div>
          <div className="grid min-w-0 flex-1 gap-1">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{categoryLabel(l.category)}</Badge>
              {!l.is_active && <Badge variant="destructive">Dada de baja</Badge>}
            </div>
            <Link to={`/listings/${l.id}`} className="truncate font-semibold hover:underline">{l.title}</Link>
            <p className="text-sm text-muted-foreground">{money(l.price_per_night)} {priceUnit(l)} · {l.max_guests} pers.</p>
            <div className="mt-1 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(l)}>Editar</Button>
              {l.is_active && (
                <ConfirmAction label="Dar de baja" title="¿Dar de baja esta oferta?" confirmLabel="Dar de baja"
                  description="Dejará de aparecer en la búsqueda. Si tiene reservas pendientes o confirmadas vigentes, no se podrá dar de baja."
                  action={async () => { await deactivateListing(l.id) }} successMessage="Oferta dada de baja." onDone={load} />
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
