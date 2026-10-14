// Etiquetas, colores y textos centralizados. El backend no distingue unidades:
// solo guarda un precio por rango de fechas; aquí se adapta el texto de la interfaz.
export const CATEGORIES = {
  lodging: { label: 'Alojamiento', unit: 'por noche', nights: 'noche', plural: 'noches' },
  package: { label: 'Paquete turístico', unit: 'por día', nights: 'día', plural: 'días' },
  guide: { label: 'Guía turístico', unit: 'por día', nights: 'día', plural: 'días' },
  activity: { label: 'Actividad/Tour', unit: 'por día', nights: 'día', plural: 'días' },
}
export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, c]) => ({ value, label: c.label }))

export const DIFFICULTY = { easy: 'Fácil', medium: 'Media', hard: 'Alta' }
export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY).map(([value, label]) => ({ value, label }))

export const BOOKING_MODES = { exclusive: 'Exclusiva (una reserva por fecha)', shared: 'Compartida (cupos por fecha)' }

export const categoryLabel = (c) => CATEGORIES[c]?.label ?? c

export function priceUnit(listing) {
  if (listing.booking_mode === 'shared') return 'por persona y día'
  return CATEGORIES[listing.category]?.unit ?? 'por día'
}

export function unitWord(category, n) {
  const c = CATEGORIES[category] ?? CATEGORIES.package
  return n === 1 ? c.nights : c.plural
}

// Total en vivo: misma regla que el backend (exclusiva: días × precio; compartida: días × precio × personas).
export function computeTotal(listing, nights, guests) {
  const base = Number(listing.price_per_night) * nights
  return listing.booking_mode === 'shared' ? base * guests : base
}

export const BOOKING_STATUS = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-900 border-amber-300' },
  confirmed: { label: 'Confirmada', className: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-900 border-red-300' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-900 border-red-300' },
  completed: { label: 'Finalizada', className: 'bg-stone-200 text-stone-800 border-stone-300' },
}

export const PAYMENT_STATUS = {
  reported: 'Pago informado, esperando confirmación del anfitrión',
  succeeded: 'Pago confirmado',
  failed: 'Pago descartado',
  refunded: 'Pago reembolsado',
}
