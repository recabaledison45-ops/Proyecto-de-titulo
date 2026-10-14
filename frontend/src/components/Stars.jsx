import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

// Valoración en "burbujas" verdes (estilo Tripadvisor). Admite medios puntos.
export function StarDisplay({ value, className }) {
  const v = Number(value) || 0
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${v} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, v - (n - 1)))
        return (
          <span key={n} className="relative size-3.5 rounded-full border-[1.5px] border-accent">
            <span className="absolute inset-0 rounded-full bg-accent" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }} />
          </span>
        )
      })}
    </span>
  )
}

export function StarInput({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Calificación" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
          onClick={() => onChange(n)}
          className="rounded p-0.5"
        >
          <Star className={cn('size-8', n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
        </button>
      ))}
    </div>
  )
}
