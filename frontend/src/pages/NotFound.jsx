import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Página no encontrada')
  return (
    <div className="mx-auto max-w-lg p-10 text-center">
      <h1 className="text-3xl font-semibold">No encontramos esa página</h1>
      <p className="mt-2 text-muted-foreground">Puede que el enlace haya cambiado o que la oferta ya no esté disponible.</p>
      <Button className="mt-5" asChild><Link to="/explore">Volver a explorar</Link></Button>
    </div>
  )
}
