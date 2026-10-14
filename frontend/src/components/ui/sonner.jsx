import { Toaster as Sonner } from 'sonner'

export const Toaster = (props) => (
  <Sonner
    position="top-center"
    richColors
    toastOptions={{ classNames: { toast: 'font-sans' } }}
    style={{ '--normal-bg': 'var(--card)', '--normal-text': 'var(--foreground)', '--normal-border': 'var(--border)' }}
    {...props}
  />
)
