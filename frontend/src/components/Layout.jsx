import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navClass = ({ isActive }) =>
  cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted', isActive && 'bg-secondary text-secondary-foreground')

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-[2000] focus:bg-card focus:p-2">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-[1000] border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
          <Link to="/" className="flex items-center gap-2" aria-label="W Experiencias, inicio">
            <svg viewBox="0 0 64 64" className="size-7" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="var(--primary)" />
              <path d="M14 22l9 22 9-16 9 16 9-22" fill="none" stroke="var(--background)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-serif text-lg font-semibold tracking-tight">W Experiencias</span>
          </Link>
          <nav aria-label="Principal" className="flex flex-1 flex-wrap items-center gap-1">
            <NavLink to="/" end className={navClass}>Explorar</NavLink>
            {user && <NavLink to="/bookings" className={navClass}>Mis reservas</NavLink>}
            {user && (user.role === 'host' || user.is_staff) && <NavLink to="/account" className={navClass}>Mi cuenta</NavLink>}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {user.display_name || user.username} · {user.role === 'host' ? 'anfitrión' : 'huésped'}
                </span>
                <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/') }}>
                  <LogOut /> Salir
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/login">Ingresar</Link></Button>
                <Button size="sm" asChild><Link to="/register">Crear cuenta</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
