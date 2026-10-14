import { useMemo, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { Minus, Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createBooking } from '@/api/bookings'
import { errorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { StarDisplay } from '@/components/Stars'
import { useAuth } from '@/hooks/useAuth'
import { fmtDate, fromISODate, money, toISODate } from '@/lib/format'
import { computeTotal, priceUnit, unitWord } from '@/lib/labels'

export default function BookingWidget({ listing, booked, onBooked }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [range, setRange] = useState(undefined)
  const [guests, setGuests] = useState(1)
  const [busy, setBusy] = useState(false)
  const [today] = useState(() => new Date())

  const guestsN = Math.max(1, Math.min(Number(guests) || 1, listing.max_guests))
  const shared = listing.booking_mode === 'shared'

  // Fechas bloqueadas: exclusiva → cualquier fecha ocupada; compartida → sin cupo para las personas elegidas.
  const blocked = useMemo(() => {
    const set = new Set()
    for (const o of booked?.occupied ?? []) {
      if (!shared || listing.max_guests - o.taken < guestsN) set.add(o.date)
    }
    return set
  }, [booked, shared, guestsN, listing.max_guests])
  const disabledDays = useMemo(() => [{ before: today }, ...[...blocked].map(fromISODate)], [blocked, today])

  const nights = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0
  const total = nights > 0 ? computeTotal(listing, nights, guestsN) : 0
  const isOwner = user && user.id === listing.host.id

  function onSelect(next, triggerDate) {
    if (next?.from && next?.to) {
      for (let d = new Date(next.from); d < next.to; d.setDate(d.getDate() + 1)) {
        if (blocked.has(toISODate(d))) {
          toast.error('Ese rango incluye fechas ocupadas. Elige otras fechas.')
          setRange({ from: triggerDate, to: undefined })
          return
        }
      }
    }
    setRange(next)
  }

  async function reserve() {
    if (!user) return navigate('/login', { state: { from: location.pathname } })
    setBusy(true)
    try {
      await createBooking({ listing: listing.id, check_in: toISODate(range.from), check_out: toISODate(range.to), guests: guestsN })
      toast.success('Reserva creada. Queda pendiente hasta que se confirme el pago.')
      navigate('/bookings')
    } catch (e) {
      toast.error(errorMessage(e))
      if (e.response?.status === 409) { setRange(undefined); onBooked?.() }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="reservar" className="rounded-3xl border bg-card p-6 shadow-xl lg:sticky lg:top-24">
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-extrabold">
          {money(listing.price_per_night)} <span className="text-sm font-normal text-muted-foreground">{priceUnit(listing)}</span>
        </p>
        {listing.rating_avg != null && (
          <p className="flex items-center gap-1.5 text-sm"><StarDisplay value={listing.rating_avg} /><span className="font-semibold">{listing.rating_avg}</span></p>
        )}
      </div>
      {shared && <p className="mt-1 text-xs text-muted-foreground">Actividad grupal: cupos limitados por fecha ({listing.max_guests} personas).</p>}

      <div className="mt-4 flex justify-center overflow-x-auto rounded-2xl border p-2">
        <Calendar mode="range" selected={range} onSelect={onSelect} disabled={disabledDays} numberOfMonths={1} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border p-4">
        <div>
          <p id="guests-label" className="text-sm font-semibold">Personas</p>
          <p className="text-xs text-muted-foreground">Máximo {listing.max_guests}</p>
        </div>
        <div className="flex items-center gap-3" role="group" aria-labelledby="guests-label">
          <button type="button" aria-label="Menos personas" disabled={guestsN <= 1} onClick={() => setGuests(guestsN - 1)}
            className="flex size-9 items-center justify-center rounded-full border border-foreground/30 hover:border-foreground disabled:opacity-30"><Minus className="size-4" /></button>
          <output id="guests" aria-live="polite" className="w-6 text-center text-base font-semibold">{guestsN}</output>
          <button type="button" aria-label="Más personas" disabled={guestsN >= listing.max_guests} onClick={() => setGuests(guestsN + 1)}
            className="flex size-9 items-center justify-center rounded-full border border-foreground/30 hover:border-foreground disabled:opacity-30"><Plus className="size-4" /></button>
        </div>
      </div>

      <div className="mt-4">
        {nights > 0 ? (
          <dl className="grid gap-1.5 text-sm" aria-live="polite">
            <div className="flex justify-between"><dt>Llegada</dt><dd className="font-medium">{fmtDate(range.from)}</dd></div>
            <div className="flex justify-between"><dt>Salida</dt><dd className="font-medium">{fmtDate(range.to)}</dd></div>
            <div className="flex justify-between gap-3">
              <dt className="underline decoration-dotted">{money(listing.price_per_night)} × {nights} {unitWord(listing.category, nights)}{shared ? ` × ${guestsN} pers.` : ''}</dt>
              <dd>{money(total)}</dd>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg font-extrabold"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Elige llegada y salida en el calendario para ver el total. La salida no cuenta como día ocupado.</p>
        )}
      </div>

      <Button size="lg" className="mt-4 w-full text-base" disabled={busy || nights < 1 || isOwner} onClick={reserve}>
        {isOwner ? 'Es tu propia oferta' : busy ? 'Reservando…' : user ? 'Reservar' : 'Ingresar para reservar'}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">No se te cobra todavía: pagas por transferencia después de reservar.</p>
    </div>
  )
}
