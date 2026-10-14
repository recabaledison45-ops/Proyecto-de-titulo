import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Search, Users } from 'lucide-react'
import { DESTINATIONS } from '@/lib/destinations'
import { todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'

function Field({ id, label, icon: Icon, children, className }) {
  return (
    <label htmlFor={id} className={cn('flex min-w-0 flex-1 cursor-text items-center gap-3 rounded-2xl px-5 py-3 text-left transition-colors hover:bg-muted/70 md:rounded-full', className)}>
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="grid min-w-0 flex-1">
        <span className="text-xs font-bold">{label}</span>
        {children}
      </span>
    </label>
  )
}

const inputClass = 'w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground'

// Buscador de la portada: lleva al explorador con los filtros en la URL.
export default function SearchBar({ className }) {
  const navigate = useNavigate()
  const [where, setWhere] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (Boolean(checkIn) !== Boolean(checkOut)) return setError('Indica la fecha de llegada y la de salida.')
    if (checkIn && checkOut && checkOut <= checkIn) return setError('La salida debe ser posterior a la llegada.')
    setError('')
    const params = new URLSearchParams()
    const text = where.trim()
    const dest = DESTINATIONS.find((d) => d.name.toLowerCase() === text.toLowerCase())
    if (dest) params.set('dest', dest.id)
    else if (text) params.set('q', text)
    if (checkIn && checkOut) { params.set('check_in', checkIn); params.set('check_out', checkOut) }
    if (guests) params.set('guests', guests)
    navigate(`/explore${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <form onSubmit={submit} role="search" aria-label="Buscar experiencias" className={cn('w-full', className)} noValidate>
      <div className="flex flex-col gap-1 rounded-3xl border bg-white p-2 shadow-2xl md:flex-row md:items-center md:gap-0 md:rounded-full md:p-2">
        <Field id="s-where" label="¿Dónde?" icon={MapPin} className="md:flex-[1.4]">
          <input id="s-where" list="destinos" className={inputClass} placeholder="Constitución, Talca, kayak…" value={where}
            onChange={(e) => setWhere(e.target.value)} autoComplete="off" maxLength={100} />
          <datalist id="destinos">{DESTINATIONS.map((d) => <option key={d.id} value={d.name} />)}</datalist>
        </Field>
        <span className="hidden h-8 w-px bg-border md:block" aria-hidden="true" />
        <Field id="s-in" label="Llegada" icon={CalendarDays}>
          <input id="s-in" type="date" className={inputClass} min={todayISO()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </Field>
        <span className="hidden h-8 w-px bg-border md:block" aria-hidden="true" />
        <Field id="s-out" label="Salida" icon={CalendarDays}>
          <input id="s-out" type="date" className={inputClass} min={checkIn || todayISO()} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </Field>
        <span className="hidden h-8 w-px bg-border md:block" aria-hidden="true" />
        <Field id="s-guests" label="Personas" icon={Users} className="md:max-w-44">
          <input id="s-guests" type="number" min={1} max={50} className={inputClass} placeholder="¿Cuántos?" value={guests} onChange={(e) => setGuests(e.target.value)} />
        </Field>
        <button type="submit"
          className="bg-brand mt-1 flex h-14 items-center justify-center gap-2 rounded-2xl px-7 text-base font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] md:mt-0 md:ml-1 md:rounded-full">
          <Search className="size-5" aria-hidden="true" /> Buscar
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-white/95 px-4 py-2 text-sm font-medium text-destructive shadow">{error}</p>}
    </form>
  )
}
