import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bed, Compass, Heart, Mountain, Package, Search } from 'lucide-react'
import { useEffect } from 'react'
import Logo from '@/components/Logo'
import UserMenu from '@/components/UserMenu'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const YEAR = new Date().getFullYear()

const NAV = [
  { to: '/explore?category=lodging', label: 'Alojamientos', icon: Bed },
  { to: '/explore?category=package', label: 'Paquetes', icon: Package },
  { to: '/explore?category=guide', label: 'Guías', icon: Compass },
  { to: '/explore?category=activity', label: 'Actividades', icon: Mountain },
]

function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-3">
          <Link to="/" className="flex items-center gap-2"><Logo className="size-8" /><span className="text-lg font-extrabold">W Experiencias</span></Link>
          <p className="text-sm text-muted-foreground">Turismo regenerativo y de bienestar en la Región del Maule, con emprendimientos locales.</p>
        </div>
        <nav aria-label="Explorar" className="grid content-start gap-2 text-sm">
          <h2 className="text-sm font-bold">Explorar</h2>
          {NAV.map((n) => <Link key={n.to} to={n.to} className="text-muted-foreground hover:text-foreground hover:underline">{n.label}</Link>)}
        </nav>
        <nav aria-label="Comunidad" className="grid content-start gap-2 text-sm">
          <h2 className="text-sm font-bold">Comunidad</h2>
          <Link to="/register?role=host" className="text-muted-foreground hover:text-foreground hover:underline">Conviértete en anfitrión</Link>
          <Link to="/favorites" className="text-muted-foreground hover:text-foreground hover:underline">Mis favoritos</Link>
          <Link to="/bookings" className="text-muted-foreground hover:text-foreground hover:underline">Mis reservas</Link>
        </nav>
        <div className="grid content-start gap-2 text-sm">
          <h2 className="text-sm font-bold">Destinos</h2>
          <Link to="/explore?dest=constitucion" className="text-muted-foreground hover:text-foreground hover:underline">Constitución</Link>
          <Link to="/explore?dest=talca" className="text-muted-foreground hover:text-foreground hover:underline">Talca</Link>
          <Link to="/explore?dest=molina" className="text-muted-foreground hover:text-foreground hover:underline">Molina · Siete Tazas</Link>
          <Link to="/explore?dest=vichuquen" className="text-muted-foreground hover:text-foreground hover:underline">Vichuquén</Link>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground">© {YEAR} W Experiencias · Proyecto de título · Región del Maule, Chile</p>
      </div>
    </footer>
  )
}

export default function Layout() {
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  const isExplore = pathname === '/explore'
  const isHost = user && (user.role === 'host' || user.is_staff)

  // Al cambiar de página se vuelve arriba (salvo en el explorador, que tiene su propio desplazamiento).
  useEffect(() => { if (!isExplore) window.scrollTo(0, 0) }, [pathname, isExplore])

  const activeCategory = new URLSearchParams(search).get('category')

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-[2000] focus:bg-card focus:p-2">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-[1000] border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="W Experiencias, inicio">
            <Logo />
            <span className="text-brand hidden text-xl font-extrabold tracking-tight sm:inline">W Experiencias</span>
          </Link>

          <nav aria-label="Categorías" className="no-scrollbar mx-auto hidden items-center gap-1 overflow-x-auto md:flex">
            {NAV.map(({ to, label, icon: Icon }) => {
              const cat = new URL(to, 'http://x').searchParams.get('category')
              const current = isExplore && activeCategory === cat
              return (
                <NavLink key={to} to={to}
                  className={cn('flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-muted', current ? 'bg-foreground text-background hover:bg-foreground' : 'text-foreground/80')}>
                  <Icon className="size-4" aria-hidden="true" />{label}
                </NavLink>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link to="/explore" aria-label="Buscar" className="flex size-11 items-center justify-center rounded-full hover:bg-muted md:hidden">
              <Search className="size-5" />
            </Link>
            <Link to="/favorites" aria-label="Favoritos" className="hidden size-11 items-center justify-center rounded-full hover:bg-muted sm:flex">
              <Heart className="size-5" />
            </Link>
            <Link to={isHost ? '/account' : '/register?role=host'}
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-muted lg:block">
              {isHost ? 'Panel de anfitrión' : 'Publica tu experiencia'}
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      {!isExplore && <Footer />}
      <Toaster />
    </div>
  )
}
