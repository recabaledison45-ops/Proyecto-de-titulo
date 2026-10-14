import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
export const money = (v) => clp.format(Number(v ?? 0))
export const moneyShort = (v) => {
  const n = Number(v)
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`
}
export const toISODate = (d) => format(d, 'yyyy-MM-dd')
export const fromISODate = (s) => parseISO(s)
export const fmtDate = (s) => format(typeof s === 'string' ? parseISO(s) : s, 'd MMM yyyy', { locale: es })
export const fmtDateTime = (s) => format(typeof s === 'string' ? parseISO(s) : s, 'd MMM, HH:mm', { locale: es })
export const todayISO = () => toISODate(new Date())
