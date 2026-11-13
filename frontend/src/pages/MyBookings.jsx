import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Users } from 'lucide-react'
import { cancelBooking, listBookings } from '@/api/bookings'
import { errorMessage } from '@/api/client'
import ConfirmAction from '@/components/ConfirmAction'
import PayDialog from '@/components/PayDialog'
import ReviewDialog from '@/components/ReviewDialog'
import StatusBadge from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { fmtDate, fmtDateTime, money } from '@/lib/format'
import { PAYMENT_STATUS, categoryLabel } from '@/lib/labels'

function BookingItem({ b, reload }) {
  const canPay = b.status === 'pending' && (!b.payment || ['failed', 'pending', 'refunded'].includes(b.payment.status))
  const canReview = ['confirmed', 'completed'].includes(b.status) && !b.reviewed_by_me
  const canCancel = ['pending', 'confirmed'].includes(b.status)
  const byCard = b.payment?.method === 'webpay'
  const refundNote = b.payment?.status !== 'succeeded'
    ? 'Las fechas quedarán libres para otras personas.'
    : byCard
      ? 'Como pagaste con tarjeta, el monto se devolverá a la misma tarjeta (el plazo depende de tu banco).'
      : 'Como la reserva está pagada, se registrará el reembolso. Los reembolsos por transferencia se coordinan con el anfitrión.'
  const paymentText = b.payment && (byCard && b.payment.status === 'succeeded'
    ? `Pagado con tarjeta${b.payment.receipt?.card_last4 ? ` terminada en ${b.payment.receipt.card_last4}` : ''}`
    : byCard && b.payment.status === 'failed' ? 'El pago con tarjeta no se completó (no se hizo ningún cargo)'
      : byCard && b.payment.status === 'refunded' ? 'Pago devuelto a tu tarjeta' : PAYMENT_STATUS[b.payment.status])

  return (
    <Card data-booking-id={b.id}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="grid gap-1">
          <Badge variant="secondary" className="w-fit">{categoryLabel(b.listing.category)}</Badge>
          <CardTitle><Link to={`/listings/${b.listing.id}`} className="hover:underline">{b.listing.title}</Link></CardTitle>
          <p className="text-sm text-muted-foreground">Reserva #{b.id} · {b.listing.city}</p>
        </div>
        <StatusBadge status={b.status} />
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5"><CalendarDays className="size-4" /> {fmtDate(b.check_in)} → {fmtDate(b.check_out)}</span>
          <span className="flex items-center gap-1.5"><Users className="size-4" /> {b.guests} {b.guests === 1 ? 'persona' : 'personas'}</span>
          <span className="font-semibold">{money(b.total_price)}</span>
        </div>
        {paymentText && <p className="text-sm text-muted-foreground">{paymentText}</p>}
        {b.status === 'pending' && b.expires_at && canPay && (
          <p className="text-xs text-amber-800">Paga antes del {fmtDateTime(b.expires_at)} o la reserva expirará y se liberarán las fechas.</p>
        )}
        {b.cancel_reason && b.status !== 'confirmed' && (
          <p className="text-xs text-muted-foreground">Motivo: {b.cancel_reason === 'expired' ? 'venció sin pago' : b.cancel_reason}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {canPay && <PayDialog booking={b} onDone={reload} />}
          {canReview && <ReviewDialog booking={b} subject="la experiencia" onDone={reload} />}
          {b.reviewed_by_me && <Badge variant="outline">Reseña enviada</Badge>}
          {canCancel && (
            <ConfirmAction label="Cancelar" title="¿Cancelar esta reserva?" description={refundNote} confirmLabel="Sí, cancelar"
              action={() => cancelBooking(b.id)} successMessage="Reserva cancelada." onDone={reload} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyBookings() {
  usePageTitle('Mis reservas', { noindex: true })
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    listBookings('guest').then(setItems).catch((e) => setError(errorMessage(e)))
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-semibold">Mis reservas</h1>
      {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!items && !error && <div className="grid gap-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>}
      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">Aún no tienes reservas.</p>
          <Button className="mt-4" asChild><Link to="/explore">Explorar experiencias</Link></Button>
        </div>
      )}
      <div className="grid gap-4">{items?.map((b) => <BookingItem key={b.id} b={b} reload={load} />)}</div>
    </div>
  )
}
