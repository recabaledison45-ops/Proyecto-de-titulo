import { cn } from '@/lib/utils'

export const Card = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-4 rounded-xl border bg-card py-5 text-card-foreground shadow-xs', className)} {...props} />
)
export const CardHeader = ({ className, ...props }) => <div className={cn('flex flex-col gap-1.5 px-5', className)} {...props} />
export const CardTitle = ({ className, ...props }) => <h3 className={cn('text-lg leading-snug font-semibold', className)} {...props} />
export const CardDescription = ({ className, ...props }) => <p className={cn('text-sm text-muted-foreground', className)} {...props} />
export const CardContent = ({ className, ...props }) => <div className={cn('px-5', className)} {...props} />
export const CardFooter = ({ className, ...props }) => <div className={cn('flex items-center px-5', className)} {...props} />
