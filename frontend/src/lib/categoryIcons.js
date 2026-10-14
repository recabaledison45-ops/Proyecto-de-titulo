import { Bed, Compass, Mountain, Package } from 'lucide-react'

// Icono y degradado de respaldo por categoría (se usa cuando una oferta no tiene foto).
export const CATEGORY_META = {
  lodging: { icon: Bed, from: '#fb7185', to: '#be123c' },
  package: { icon: Package, from: '#fbbf24', to: '#c2410c' },
  guide: { icon: Compass, from: '#34d399', to: '#047857' },
  activity: { icon: Mountain, from: '#38bdf8', to: '#1d4ed8' },
}
export const categoryMeta = (c) => CATEGORY_META[c] ?? CATEGORY_META.activity
