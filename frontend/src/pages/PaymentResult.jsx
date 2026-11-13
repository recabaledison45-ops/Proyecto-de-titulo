import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleAlert, CircleCheck, CircleX, Undo2 } from 'lucide-react'
import { listBookings } from '@/api/bookings'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { fmtDate, fmtDateTime, money } from '@/lib/format'
import { PAYMENT_TYPES } from '@/lib/webpay'

const OUTCOMES = {
  success: { Icon: CircleCheck, tone: 'text-emerald-600', title: '¡Pago aprobado! Tu reserva está confirmada', text: 'Te enviamos la confirmación por correo. Guarda este comprobante.' },
  failed: { Icon: CircleX, tone: 'text-destructive', title: 'El pago fue rechazado', text: 'No se hizo ningún cargo. Revisa los datos o el saldo de tu tarjeta, o intenta con otra. Tu reserva sigue pendiente.' },
  cancelled: { Icon: CircleAlert, tone: 'text-amber-600', title: 'Cancelaste el pago', text: 'No se hizo ningún cargo. Tu reserva sigue pendiente y puedes pagarla cuando quieras antes de que venza.' },
  refunded: { Icon: Undo2, tone: 'text-amber-600', title: 'El pago se devolvió a tu tarjeta', text: 'El cargo se aprobó, pero la reserva ya no estaba disponible para pagarse (venció o se canceló), así que anulamos el cobro. Si ves el cargo en tu cuenta, se reversará según los plazos de tu banco.' },
  error: { Icon: CircleAlert, tone: 'text-amber-600', title: 'No pudimos confirmar el pago', text: 'Hubo un problema de comunicación con Webpay. Si no confirmamos el pago, Transbank no hace el cargo. Revisa el estado en «Mis reservas» e intenta de nuevo.' },
}

function Row({ label, children }) {
  return <div className="flex justify-between gap-4 py-2"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{children}</dd></div>
}

// Llega aquí el navegador al volver de Webpay. El parámetro `status` solo orienta el mensaje:
// lo que se muestra como pagado sale del estado real de la reserva consultado a la API.
export default function PaymentResult() {
  const [params] = useSearchParams()
  const bookingId = Number(params.get('booking'))
  const [booking, setBooking] = useState(undefined)
  usePageTitle('Resultado del pago', { noindex: true })

  useEffect(() => {
    let alive = true
    listBookings('guest')
      .then((all) => alive && setBooking(all.find((b) => b.id === bookingId) ?? null))
      .catch(() => alive && setBooking(null))
    return () => { alive = false }
  }, [bookingId])

  if (booking === undefined) return <div className="mx-auto max-w-xl p-6"><Skeleton className="h-80 w-full" /></div>

  const paid = booking?.payment?.status === 'succeeded' && booking.status === 'confirmed'
  const hinted = params.get('status')
  const outcome = OUTCOMES[paid ? 'success' : hinted === 'success' || !OUTCOMES[hinted] ? 'error' : hinted]
  const receipt = paid ? booking.payment.receipt : null
  const { Icon } = outcome

  return (
    <div className="mx-auto max-w-xl p-4 py-10 sm:p-6 sm:py-14">
      <Card>
        <CardContent className="grid gap-5 p-6 sm:p-8">
          <div className="grid justify-items-center gap-3 text-center">
            <Icon className={`size-14 ${outcome.tone}`} aria-hidden="true" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold">{outcome.title}</h1>
            <p className="text-sm text-muted-foreground">{outcome.text}</p>
          </div>

          {booking && (
            <dl className="divide-y rounded-xl border px-4 text-sm">
              <Row label="Reserva">#{booking.id} · {booking.listing.title}</Row>
              <Row label="Fechas">{fmtDate(booking.check_in)} → {fmtDate(booking.check_out)}</Row>
              <Row label={paid ? 'Monto pagado' : 'Monto de la reserva'}>{money(booking.total_price)}</Row>
              {receipt && (
                <>
                  <Row label="Orden de compra"><span className="font-mono">{receipt.buy_order}</span></Row>
                  <Row label="Código de autorización"><span className="font-mono">{receipt.authorization_code}</span></Row>
                  <Row label="Fecha del pago">{receipt.transaction_date ? fmtDateTime(receipt.transaction_date) : '—'}</Row>
                  <Row label="Tipo de pago">{PAYMENT_TYPES[receipt.payment_type_code] ?? receipt.payment_type_code}</Row>
                  {receipt.installments_number > 0 && <Row label="Cuotas">{receipt.installments_number}</Row>}
                  <Row label="Tarjeta">terminada en <span className="font-mono">{receipt.card_last4}</span></Row>
                  <Row label="Comercio">W Experiencias</Row>
                </>
              )}
            </dl>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className={paid ? '' : 'bg-brand text-white hover:opacity-95'}><Link to="/bookings">{paid ? 'Ver mis reservas' : 'Ir a mis reservas para reintentar'}</Link></Button>
            {paid && <Button variant="outline" onClick={() => window.print()}>Imprimir comprobante</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
