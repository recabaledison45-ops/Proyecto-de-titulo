import { createContext, useContext, useId } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Controller, FormProvider, useFormContext, useFormState } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export const Form = FormProvider

const FormFieldContext = createContext({})
const FormItemContext = createContext({})

export function FormField(props) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

function useFormField() {
  const { name } = useContext(FormFieldContext)
  const { id } = useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name })
  const fieldState = getFieldState(name, formState)
  return { id, name, formItemId: `${id}-item`, formDescriptionId: `${id}-desc`, formMessageId: `${id}-msg`, ...fieldState }
}

export function FormItem({ className, ...props }) {
  const id = useId()
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn('grid gap-1.5', className)} {...props} />
    </FormItemContext.Provider>
  )
}

export function FormLabel({ className, ...props }) {
  const { error, formItemId } = useFormField()
  return <Label className={cn(error && 'text-destructive', className)} htmlFor={formItemId} {...props} />
}

export function FormControl(props) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  return (
    <Slot
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error}
      {...props}
    />
  )
}

export function FormDescription({ className, ...props }) {
  const { formDescriptionId } = useFormField()
  return <p id={formDescriptionId} className={cn('text-xs text-muted-foreground', className)} {...props} />
}

export function FormMessage({ className, children, ...props }) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? '') : children
  if (!body) return null
  return (
    <p id={formMessageId} role="alert" aria-live="polite" className={cn('text-xs text-destructive', className)} {...props}>
      {body}
    </p>
  )
}
