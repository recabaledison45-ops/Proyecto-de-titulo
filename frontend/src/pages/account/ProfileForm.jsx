import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { errorMessage, fieldErrors } from '@/api/client'
import { updateMe } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'

export default function ProfileForm() {
  const { user, setUser } = useAuth()
  const form = useForm({
    defaultValues: { display_name: user.display_name, email: user.email, phone: user.phone, bio: user.bio, bank_details: user.bank_details },
  })

  async function onSubmit(values) {
    try {
      setUser(await updateMe(values))
      toast.success('Perfil actualizado.')
    } catch (e) {
      const errs = fieldErrors(e)
      Object.entries(errs).forEach(([n, message]) => form.setError(n, { message }))
      if (!Object.keys(errs).length) toast.error(errorMessage(e))
    }
  }

  const text = (name, label, hint, Comp = Input, props = {}) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Comp {...props} {...field} /></FormControl>
        {hint && <FormDescription>{hint}</FormDescription>}
        <FormMessage />
      </FormItem>
    )} />
  )

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Perfil del anfitrión</CardTitle>
        <CardDescription>Se muestra en la ficha de tus ofertas. Los datos bancarios solo los ve el huésped que reserva contigo.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            {text('display_name', 'Nombre público (emprendimiento)', 'Ej.: W Experiencias')}
            {text('bio', 'Presentación', 'Cuenta quién eres y qué aporta tu emprendimiento a la comunidad.', Textarea, { rows: 4 })}
            {text('email', 'Correo', 'Recibirás aquí los avisos de nuevas reservas.', Input, { type: 'email' })}
            {text('phone', 'Teléfono')}
            {text('bank_details', 'Datos para transferencia', 'Banco, tipo y número de cuenta, RUT y correo de confirmación.', Textarea, { rows: 4 })}
            <Button type="submit" className="w-fit" disabled={form.formState.isSubmitting}>Guardar perfil</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
