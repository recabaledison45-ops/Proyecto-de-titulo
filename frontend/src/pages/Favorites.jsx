import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { getListing } from '@/api/listings'
import ListingCard from '@/components/ListingCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useFavorites } from '@/lib/favorites'

export default function Favorites() {
  usePageTitle('Favoritos')
  const { ids } = useFavorites()
  const [items, setItems] = useState({})

  // Se cargan solo las ofertas que aún no están en memoria; las dadas de baja (404) se ignoran.
  useEffect(() => {
    let alive = true
    const missing = ids.filter((id) => !(id in items))
    if (!missing.length) return
    Promise.allSettled(missing.map((id) => getListing(id))).then((res) => {
      if (!alive) return
      setItems((prev) => {
        const next = { ...prev }
        res.forEach((r, i) => { next[missing[i]] = r.status === 'fulfilled' && r.value.is_active ? r.value : null })
        return next
      })
    })
    return () => { alive = false }
  }, [ids, items])

  const loading = ids.some((id) => !(id in items))
  const visible = ids.map((id) => items[id]).filter(Boolean)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Tus favoritos</h1>
      <p className="mt-1 mb-8 text-muted-foreground">Guardados en este navegador para que los encuentres rápido.</p>
      {loading && ids.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{ids.slice(0, 4).map((id) => <Skeleton key={id} className="aspect-[4/3] w-full rounded-2xl" />)}</div>
      )}
      {!loading && visible.length === 0 && (
        <div className="mx-auto max-w-md rounded-3xl border border-dashed p-12 text-center">
          <Heart className="mx-auto size-10 text-primary" aria-hidden="true" />
          <p className="mt-3 text-lg font-bold">Aún no tienes favoritos</p>
          <p className="mt-1 text-sm text-muted-foreground">Toca el corazón de una oferta para guardarla aquí.</p>
          <Button className="mt-5" asChild><Link to="/explore">Explorar experiencias</Link></Button>
        </div>
      )}
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </div>
  )
}
