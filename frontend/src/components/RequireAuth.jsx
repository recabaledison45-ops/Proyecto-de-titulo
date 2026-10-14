import { Link, Navigate, useLocation } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

// Protege rutas por sesión y, opcionalmente, por rol (`role="host"`; el administrador también pasa).
export default function RequireAuth({ role, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="mx-auto max-w-5xl p-6"><Skeleton className="h-40 w-full" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (role && user.role !== role && !user.is_staff) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-2xl font-semibold">Solo para anfitriones</h1>
        <p className="mt-2 text-muted-foreground">Tu cuenta es de huésped. Crea una cuenta de anfitrión para publicar ofertas.</p>
        <Button className="mt-4" asChild><Link to="/explore">Volver a explorar</Link></Button>
      </div>
    )
  }
  return children
}
