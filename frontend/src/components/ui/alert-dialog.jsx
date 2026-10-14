import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger

export function AlertDialogContent({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[1200] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-[1200] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-card p-6 shadow-lg sm:max-w-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
}
export const AlertDialogHeader = ({ className, ...props }) => <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />
export const AlertDialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
)
export const AlertDialogTitle = ({ className, ...props }) => (
  <AlertDialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />
)
export const AlertDialogDescription = ({ className, ...props }) => (
  <AlertDialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
)
export const AlertDialogAction = ({ className, ...props }) => (
  <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />
)
export const AlertDialogCancel = ({ className, ...props }) => (
  <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />
)
