import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarCheck, Heart, LayoutDashboard, LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

function Item({ to, icon: Icon, children, onClick }) {
  const cls = 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted'
  return to ? (
    <Link to={to} role="menuitem" className={cls} onClick={onClick}><Icon className="size-4" aria-hidden="true" />{children}</Link>
  ) : (
    <button type="button" role="menuitem" className={cls} onClick={onClick}><Icon className="size-4" aria-hidden="true" />{children}</button>
  )
}

// Menú de usuario: avatar + hamburguesa (estilo Airbnb). Se cierra con clic fuera, Escape o al navegar.
export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const close = () => setOpen(false)
  const initial = (user?.display_name || user?.username || '?').slice(0, 1).toUpperCase()
  const isHost = user && (user.role === 'host' || user.is_staff)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de cuenta"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-2.5 rounded-full border bg-card py-1 pr-1 pl-3.5 shadow-xs transition-shadow hover:shadow-md"
      >
        <Menu className="size-4" aria-hidden="true" />
        <span className={cn('flex size-8 items-center justify-center rounded-full text-sm font-bold text-white', user ? 'bg-brand' : 'bg-muted-foreground/70')}>
          {user ? initial : '?'}
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-[1100] mt-2 w-64 overflow-hidden rounded-2xl border bg-popover py-2 shadow-xl">
          {user ? (
            <>
              <div className="border-b px-4 pb-2.5">
                <p className="truncate text-sm font-semibold">{user.display_name || user.username}</p>
                <p className="text-xs text-muted-foreground">{user.role === 'host' ? 'Anfitrión' : 'Huésped'}</p>
              </div>
              <Item to="/bookings" icon={CalendarCheck} onClick={close}>Mis reservas</Item>
              <Item to="/favorites" icon={Heart} onClick={close}>Favoritos</Item>
              {isHost && <Item to="/account" icon={LayoutDashboard} onClick={close}>Panel de anfitrión</Item>}
              <div className="my-1 border-t" />
              <Item icon={LogOut} onClick={() => { close(); logout(); navigate('/') }}>Cerrar sesión</Item>
            </>
          ) : (
            <>
              <Link to="/register" role="menuitem" className="block px-4 py-2.5 text-sm font-semibold hover:bg-muted" onClick={close}>Crear cuenta</Link>
              <Link to="/login" role="menuitem" className="block px-4 py-2.5 text-sm hover:bg-muted" onClick={close}>Ingresar</Link>
              <div className="my-1 border-t" />
              <Item to="/favorites" icon={Heart} onClick={close}>Favoritos</Item>
            </>
          )}
        </div>
      )}
    </div>
  )
}
