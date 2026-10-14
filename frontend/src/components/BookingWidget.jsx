import { useMemo, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createBooking } from '@/api/bookings'
import { errorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="text-2xl">
          {money(listing.price_per_night)} <span className="text-sm font-normal text-muted-foreground">{priceUnit(listing)}</span>
        </CardTitle>
        {shared && <p className="text-xs text-muted-foreground">Actividad grupal: cupos limitados por fecha ({listing.max_guests} personas).</p>}
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex justify-center overflow-x-auto">
          <Calendar mode="range" selected={range} onSelect={onSelect} disabled={disabledDays} numberOfMonths={1} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="guests">Personas (máx. {listing.max_guests})</Label>
          <Input id="guests" type="number" min={1} max={listing.max_guests} value={guests} onChange={(e) => setGuests(e.target.value)} />
        </div>
        <Separator />
        {nights > 0 ? (
          <dl className="grid gap-1 text-sm" aria-live="polite">
            <div className="flex justify-between"><dt>Llegada</dt><dd>{fmtDate(range.from)}</dd></div>
            <div className="flex justify-between"><dt>Salida</dt><dd>{fmtDate(range.to)}</dd></div>
            <div className="flex justify-between">
              <dt>{money(listing.price_per_night)} × {nights} {unitWord(listing.category, nights)}{shared ? ` × ${guestsN} pers.` : ''}</dt>
              <dd>{money(total)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Elige llegada y salida en el calendario para ver el total. La salida no cuenta como día ocupado.</p>
        )}
        <Button size="lg" disabled={busy || nights < 1 || isOwner} onClick={reserve}>
          {isOwner ? 'Es tu propia oferta' : busy ? 'Reservando…' : user ? 'Reservar' : 'Ingresar para reservar'}
        </Button>
      </CardContent>
    </Card>
  )
}
