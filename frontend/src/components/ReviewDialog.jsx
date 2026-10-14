import { useState } from 'react'
import { toast } from 'sonner'
import { createReview } from '@/api/reviews'
import { errorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StarInput } from '@/components/Stars'

// Reseña ciega cruzada: se publica solo cuando la otra parte también reseñó la reserva.
export default function ReviewDialog({ booking, label = 'Reseñar', subject = 'la experiencia', onDone }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!rating) return toast.error('Elige una calificación de 1 a 5 estrellas.')
    setBusy(true)
    try {
      const review = await createReview({ booking: booking.id, rating, comment })
      toast.success(review.is_published ? '¡Reseña publicada!' : 'Reseña enviada. Se publicará cuando la otra parte también reseñe.')
      setOpen(false)
      onDone?.()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">{label}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reseñar {subject}</DialogTitle>
          <DialogDescription>
            Reserva #{booking.id} · {booking.listing.title}. Las reseñas son ciegas: se hacen públicas cuando ambas partes reseñan.
          </DialogDescription>
        </DialogHeader>
        <StarInput value={rating} onChange={setRating} />
        <div className="grid gap-1.5">
          <Label htmlFor={`comment-${booking.id}`}>Comentario (opcional)</Label>
          <Textarea id={`comment-${booking.id}`} value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? 'Enviando…' : 'Enviar reseña'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
