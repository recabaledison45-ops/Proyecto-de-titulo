import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cancelBooking, completeBooking, listBookings, rejectBooking, saveNotes } from '@/api/bookings'
import { errorMessage } from '@/api/client'
import { confirmPayment } from '@/api/payments'
import ConfirmAction from '@/components/ConfirmAction'
import ReviewDialog from '@/components/ReviewDialog'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { fmtDate, money, todayISO } from '@/lib/format'
import { BOOKING_STATUS, PAYMENT_STATUS } from '@/lib/labels'

// Diálogo con un textarea: sirve para rechazar (motivo) y para las notas internas.
function TextDialog({ trigger, title, description, label, initial = '', submitLabel, onSubmit, required = false }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (required && !text.trim()) return toast.error('Escribe un motivo.')
    setBusy(true)
    try { await onSubmit(text); setOpen(false) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setText(initial) }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="txt">{label}</Label>
          <Textarea id="txt" value={text} onChange={(e) => setText(e.target.value)} maxLength={255 * 20} />
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy}>{busy ? 'Guardando…' : submitLabel}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Actions({ b, reload }) {
  const done = (msg) => () => { toast.success(msg); reload() }
  const reported = b.status === 'pending' && b.payment?.status === 'reported'
  const pastCheckout = b.check_out <= todayISO()
  return (
    <div className="flex flex-wrap gap-1.5">
      {reported && (
        <ConfirmAction label="Confirmar pago" variant="default" title="¿Confirmar la recepción del pago?"
          description={`Verifica la transferencia de ${money(b.total_price)} en tu cartola. La reserva pasará a «Confirmada» y se registrará la comisión de plataforma.`}
          confirmLabel="Sí, recibí el pago" action={() => confirmPayment(b.payment.id)} successMessage="Pago confirmado." onDone={reload} />
      )}
      {b.status === 'pending' && (
        <TextDialog required title="Rechazar reserva" description="El huésped recibirá el motivo y las fechas quedarán libres." label="Motivo"
          submitLabel="Rechazar" trigger={<Button size="sm" variant="outline">Rechazar</Button>}
          onSubmit={async (reason) => { await rejectBooking(b.id, reason); done('Reserva rechazada.')() }} />
      )}
      {b.status === 'confirmed' && pastCheckout && (
        <ConfirmAction label="Finalizar" variant="secondary" title="¿Marcar la reserva como finalizada?" description="Úsalo cuando la experiencia ya se realizó."
          action={() => completeBooking(b.id)} successMessage="Reserva finalizada." onDone={reload} />
      )}
      {b.status === 'confirmed' && (
        <ConfirmAction label="Cancelar" title="¿Cancelar la reserva?" description="Se liberarán las fechas y se registrará el reembolso del pago confirmado."
          confirmLabel="Sí, cancelar" action={() => cancelBooking(b.id, 'Cancelada por el anfitrión')} successMessage="Reserva cancelada." onDone={reload} />
      )}
      {['confirmed', 'completed'].includes(b.status) && !b.reviewed_by_me && (
        <ReviewDialog booking={b} label="Reseñar huésped" subject="al huésped" onDone={reload} />
      )}
      <TextDialog title={`Notas internas · reserva #${b.id}`} description="Solo tú (y administración) ven estas notas." label="Notas"
        initial={b.host_notes} submitLabel="Guardar notas" trigger={<Button size="sm" variant="ghost">{b.host_notes ? 'Ver notas' : 'Notas'}</Button>}
        onSubmit={async (text) => { await saveNotes(b.id, text); done('Notas guardadas.')() }} />
    </div>
  )
}

export default function HostBookings() {
  const [status, setStatus] = useState('all')
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    listBookings('host', status === 'all' ? '' : status).then(setItems).catch((e) => setError(errorMessage(e)))
  }, [status])
  useEffect(() => { load() }, [load])

  return (
    <div className="grid gap-4">
      <div className="grid w-52 gap-1">
        <Label htmlFor="st">Estado</Label>
        <Select value={status} onValueChange={(v) => { setItems(null); setStatus(v) }}>
          <SelectTrigger id="st"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(BOOKING_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!items && !error && <Skeleton className="h-48 w-full" />}
      {items && items.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No hay reservas con este filtro.</p>}
      {items && items.length > 0 && (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead><TableHead>Oferta</TableHead><TableHead>Huésped</TableHead><TableHead>Fechas</TableHead>
                <TableHead>Pers.</TableHead><TableHead>Total</TableHead><TableHead>Comisión / neto</TableHead>
                <TableHead>Estado</TableHead><TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.id}</TableCell>
                  <TableCell className="max-w-48 font-medium">{b.listing.title}</TableCell>
                  <TableCell>{b.guest.display_name}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</TableCell>
                  <TableCell>{b.guests}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(b.total_price)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {b.payment ? <>{money(b.payment.platform_fee)} / {money(b.payment.host_payout)}<br /><span className="text-muted-foreground">{PAYMENT_STATUS[b.payment.status]}</span></> : '—'}
                  </TableCell>
                  <TableCell><StatusBadge status={b.status} /></TableCell>
                  <TableCell><Actions b={b} reload={load} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
