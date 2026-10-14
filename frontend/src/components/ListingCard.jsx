import { Link } from 'react-router-dom'
import FavoriteButton from '@/components/FavoriteButton'
import ListingImage from '@/components/ListingImage'
import { money } from '@/lib/format'
import { categoryLabel, DIFFICULTY, priceUnit } from '@/lib/labels'
import { cn } from '@/lib/utils'

// Tarjeta vertical con foto grande (estilo Airbnb). `compact` reduce el tamaño del texto en listados con mapa.
export default function ListingCard({ listing, active, onHover, className }) {
  const rated = listing.rating_avg != null
  return (
    <article
      className={cn('group relative', className)}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link to={`/listings/${listing.id}`} className="block rounded-2xl focus-visible:outline-offset-4">
        <div className={cn('relative overflow-hidden rounded-2xl transition-shadow', active && 'ring-2 ring-foreground')}>
          <ListingImage src={listing.image_url} category={listing.category} className="aspect-[4/3] w-full"
            imgClassName="transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow-sm">
            {categoryLabel(listing.category)}
          </span>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-[15px] leading-snug font-semibold">{listing.title}</h3>
          <span className="flex shrink-0 items-center gap-1.5 text-sm">
            {rated ? (
              <>
                <span className="size-3 rounded-full bg-accent" aria-hidden="true" />
                <span className="font-medium">{listing.rating_avg}</span>
                <span className="text-muted-foreground">({listing.reviews_count})</span>
              </>
            ) : (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">Nuevo</span>
            )}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {listing.city}
          {listing.difficulty && <> · Dificultad {DIFFICULTY[listing.difficulty].toLowerCase()}</>}
          {listing.duration_hours && <> · {Number(listing.duration_hours)} h</>}
        </p>
        <p className="mt-1 text-[15px]">
          <span className="font-bold">{money(listing.price_per_night)}</span>{' '}
          <span className="text-muted-foreground">{priceUnit(listing)}</span>
        </p>
      </Link>
      <FavoriteButton id={listing.id} className="absolute top-3 right-3" />
    </article>
  )
}
