import { Link } from 'react-router-dom'
import { MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { money } from '@/lib/format'
import { categoryLabel, DIFFICULTY, priceUnit } from '@/lib/labels'
import { cn } from '@/lib/utils'

export default function ListingCard({ listing, active, onHover }) {
  return (
    <Card
      className={cn('gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md', active && 'ring-2 ring-primary')}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link to={`/listings/${listing.id}`} className="flex gap-3 sm:flex-row">
        <div className="h-28 w-32 shrink-0 bg-muted sm:w-36">
          {listing.image_url && <img src={listing.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-3 pr-3">
          <Badge variant="secondary" className="w-fit">{categoryLabel(listing.category)}</Badge>
          <h3 className="line-clamp-2 text-base leading-snug font-semibold">{listing.title}</h3>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {listing.city}
            {listing.difficulty && <span> · Dificultad {DIFFICULTY[listing.difficulty].toLowerCase()}</span>}
          </p>
          <div className="mt-auto flex items-end justify-between gap-2">
            <p className="text-sm">
              <span className="font-semibold">{money(listing.price_per_night)}</span>{' '}
              <span className="text-xs text-muted-foreground">{priceUnit(listing)}</span>
            </p>
            {listing.rating_avg != null && (
              <span className="flex items-center gap-1 text-xs"><Star className="size-3.5 fill-accent text-accent" />{listing.rating_avg} ({listing.reviews_count})</span>
            )}
          </div>
        </div>
      </Link>
    </Card>
  )
}
