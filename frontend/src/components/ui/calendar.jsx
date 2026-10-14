import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { cn } from '@/lib/utils'

export function Calendar({ className, ...props }) {
  return <DayPicker locale={es} weekStartsOn={1} className={cn('p-1', className)} {...props} />
}
