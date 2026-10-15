import Logo from '@/components/Logo'

// Estructura común de ingreso y registro: panel visual a la izquierda y formulario a la derecha.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-7xl lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#ff385c] via-[#d70466] to-[#5b21b6] p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <img src="https://picsum.photos/seed/maule-login/1000/1200" alt="" onError={(e) => { e.currentTarget.style.display = 'none' }}
          className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay" />
        <p className="relative flex items-center gap-2 text-2xl font-extrabold"><Logo className="size-10" /> W Experiencias</p>
        <div className="relative">
          <p className="text-4xl leading-tight font-extrabold">Descubre el Maule con anfitriones locales.</p>
          <p className="mt-3 max-w-md text-lg text-white/90">Naturaleza, bienestar y cultura: reserva en minutos y viaja con propósito.</p>
        </div>
      </aside>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-1 mb-6 text-muted-foreground">{subtitle}</p>
          {children}
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
