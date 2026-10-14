import { Badge } from '@/components/ui/badge'
import { BOOKING_STATUS } from '@/lib/labels'
import { cn } from '@/lib/utils'

export default function StatusBadge({ status }) {
  const s = BOOKING_STATUS[status] ?? { label: status, className: '' }
  return <Badge variant="outline" className={cn(s.className)}>{s.label}</Badge>
}
