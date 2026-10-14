import { useState } from 'react'
import { categoryMeta } from '@/lib/categoryIcons'
import { cn } from '@/lib/utils'

// Foto de la oferta; si no existe o falla la carga, muestra un degradado con el icono de la categoría.
export default function ListingImage({ src, category, alt = '', className, imgClassName, eager = false }) {
  const [failed, setFailed] = useState(false)
  const meta = categoryMeta(category)
  const Icon = meta.icon
  const showImage = src && !failed
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}
      style={showImage ? undefined : { backgroundImage: `linear-gradient(135deg, ${meta.from}, ${meta.to})` }}>
      {showImage ? (
        <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/85" role={alt ? 'img' : undefined} aria-label={alt || undefined}>
          <Icon className="size-1/4 min-h-8 min-w-8" strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
