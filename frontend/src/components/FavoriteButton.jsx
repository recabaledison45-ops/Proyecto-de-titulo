import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useFavorites } from '@/lib/favorites'
import { cn } from '@/lib/utils'

// Corazón para guardar una oferta en favoritos (no requiere cuenta).
export default function FavoriteButton({ id, className, label = false, variant = 'overlay' }) {
  const { has, toggle } = useFavorites()
  const active = has(id)
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toast(toggle(id) ? 'Guardado en favoritos' : 'Quitado de favoritos')
      }}
      className={cn('inline-flex items-center gap-1.5 transition-transform active:scale-90', className)}
    >
      <Heart className={cn('size-6', variant === 'overlay'
        ? cn('drop-shadow', active ? 'fill-primary text-primary' : 'fill-black/30 text-white')
        : active ? 'fill-primary text-primary' : 'text-foreground')} />
      {label && <span className="text-sm font-semibold underline">{active ? 'Guardado' : 'Guardar'}</span>}
    </button>
  )
}
