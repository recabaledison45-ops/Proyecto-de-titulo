import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = ({ className, ...props }) => <TabsPrimitive.Root className={cn('flex flex-col gap-4', className)} {...props} />
export const TabsList = ({ className, ...props }) => (
  <TabsPrimitive.List className={cn('inline-flex h-10 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1', className)} {...props} />
)
export const TabsTrigger = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs',
      className,
    )}
    {...props}
  />
)
export const TabsContent = ({ className, ...props }) => <TabsPrimitive.Content className={cn('flex-1 outline-none', className)} {...props} />
