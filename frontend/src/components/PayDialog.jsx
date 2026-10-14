import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '@/api/client'
import { pay, paymentInfo } from '@/api/payments'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { money } from '@/lib/format'

// Pago por transferencia: el huésped ve los datos, transfiere e informa el pago; el anfitrión lo confirma.
export default function PayDialog({ booking, onDone }) {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onOpenChange(next) {
    setOpen(next)
    if (next) {
      setInfo(null)
      try { setInfo(await paymentInfo(booking.id)) } catch (e) { toast.error(errorMessage(e)); setOpen(false) }
    }
  }

  async function submit() {
    setBusy(true)
    try {
      const payment = await pay(booking.id)
      toast.success(payment.status === 'succeeded' ? '¡Pago realizado! Tu reserva está confirmada.' : 'Pago informado. El anfitrión lo confirmará pronto.')
      setOpen(false)
      onDone?.()
    } catch (e) {
      toast.error(errorMessage(e))
      onDone?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm">Pagar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar reserva #{booking.id}</DialogTitle>
          <DialogDescription>Transfiere el monto exacto e indica la referencia. Luego presiona «Ya transferí».</DialogDescription>
        </DialogHeader>
        {!info ? <Skeleton className="h-28 w-full" /> : (
          <dl className="grid gap-3 rounded-lg bg-muted p-4 text-sm">
            <div className="flex justify-between"><dt>Monto a transferir</dt><dd className="font-semibold">{money(info.amount)}</dd></div>
            <div className="flex justify-between"><dt>Referencia</dt><dd className="font-mono">{info.reference}</dd></div>
            <div>
              <dt className="mb-1">Datos bancarios</dt>
              <dd className="whitespace-pre-line text-muted-foreground">{info.bank_details || 'El anfitrión aún no cargó sus datos bancarios. Contáctalo para coordinar el pago.'}</dd>
            </div>
          </dl>
        )}
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !info}>{busy ? 'Informando…' : 'Ya transferí'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
