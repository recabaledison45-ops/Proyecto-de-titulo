import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarDisplay({ value, className }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('size-4', n <= Math.round(value) ? 'fill-accent text-accent' : 'text-muted-foreground/40')} />
      ))}
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
          <Star className={cn('size-7', n <= value ? 'fill-accent text-accent' : 'text-muted-foreground/40')} />
        </button>
      ))}
    </div>
  )
}
