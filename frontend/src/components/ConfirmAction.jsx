import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '@/api/client'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

// Botón con diálogo de confirmación para acciones destructivas o irreversibles.
export default function ConfirmAction({ label, title, description, confirmLabel = 'Confirmar', variant = 'outline', action, successMessage, onDone }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      await action()
      if (successMessage) toast.success(successMessage)
      setOpen(false)
      onDone?.()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild><Button size="sm" variant={variant}>{label}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={run}>{busy ? 'Procesando…' : confirmLabel}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
