import { useState } from 'react'
import { CreditCard, Landmark, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/api/client'
import { pay, paymentInfo, startWebpay } from '@/api/payments'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { money } from '@/lib/format'
import { goToWebpay } from '@/lib/webpay'

// Dos formas de pago: tarjeta por Webpay Plus (confirma la reserva al instante) o transferencia
// (el huésped la informa y el anfitrión la confirma).
export default function PayDialog({ booking, onDone }) {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState('')

  async function onOpenChange(next) {
    if (busy === 'card') return // ya vamos camino a Webpay
    setOpen(next)
    if (next) {
      setInfo(null)
      try { setInfo(await paymentInfo(booking.id)) } catch (e) { toast.error(errorMessage(e)); setOpen(false) }
    }
  }

  async function payByCard() {
    setBusy('card')
    try {
      goToWebpay(await startWebpay(booking.id)) // sale del sitio; Webpay devuelve a /payments/result
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy('')
      onDone?.()
    }
  }

  async function payByTransfer() {
    setBusy('transfer')
    try {
      const payment = await pay(booking.id)
      toast.success(payment.status === 'succeeded' ? '¡Pago realizado! Tu reserva está confirmada.' : 'Pago informado. El anfitrión lo confirmará pronto.')
      setOpen(false)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy('')
      onDone?.()
    }
  }

  const card = info?.methods?.includes('webpay')
  const simulated = info?.methods?.includes('simulated')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm">Pagar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar reserva #{booking.id}</DialogTitle>
          <DialogDescription>
            {info ? <>Total a pagar: <strong className="text-foreground">{money(info.amount)}</strong></> : 'Cargando formas de pago…'}
          </DialogDescription>
        </DialogHeader>

        {!info ? <Skeleton className="h-40 w-full" /> : (
          <div className="grid gap-5">
            {card && (
              <section aria-labelledby="pay-card" className="grid gap-3">
                <h3 id="pay-card" className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="size-4" aria-hidden="true" /> Tarjeta de débito, crédito o prepago</h3>
                <Button onClick={payByCard} disabled={!!busy} className="bg-brand text-white hover:opacity-95">
                  {busy === 'card' ? 'Abriendo Webpay…' : `Pagar ${money(info.amount)} con tarjeta`}
                </Button>
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Pagas en el sitio seguro de Webpay (Transbank). No vemos ni guardamos los datos de tu tarjeta. La reserva se confirma al instante.
                </p>
                {info.webpay_test_mode && (
                  <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    <strong>Modo de prueba:</strong> no se cobra dinero real. Usa la tarjeta de prueba de Transbank
                    {' '}<span className="font-mono">4051 8856 0044 6623</span>, CVV <span className="font-mono">123</span>, cualquier fecha de vencimiento;
                    en el banco simulado, RUT <span className="font-mono">11.111.111-1</span> y clave <span className="font-mono">123</span>.
                  </p>
                )}
              </section>
            )}

            {card && <Separator />}

            <section aria-labelledby="pay-transfer" className="grid gap-3">
              <h3 id="pay-transfer" className="flex items-center gap-2 text-sm font-semibold">
                <Landmark className="size-4" aria-hidden="true" /> {simulated ? 'Pago simulado' : 'Transferencia bancaria'}
              </h3>
              {!simulated && (
                <dl className="grid gap-3 rounded-lg bg-muted p-4 text-sm">
                  <div className="flex justify-between"><dt>Monto a transferir</dt><dd className="font-semibold">{money(info.amount)}</dd></div>
                  <div className="flex justify-between"><dt>Referencia</dt><dd className="font-mono">{info.reference}</dd></div>
                  <div>
                    <dt className="mb-1">Datos bancarios</dt>
                    <dd className="whitespace-pre-line text-muted-foreground">{info.bank_details || 'El anfitrión aún no cargó sus datos bancarios. Contáctalo para coordinar el pago.'}</dd>
                  </div>
                </dl>
              )}
              <Button variant={card ? 'outline' : 'default'} onClick={payByTransfer} disabled={!!busy}>
                {busy === 'transfer' ? 'Informando…' : simulated ? 'Pagar (simulado)' : 'Ya transferí'}
              </Button>
              {!simulated && <p className="text-xs text-muted-foreground">El anfitrión confirma la recepción antes de que la reserva quede confirmada.</p>}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
