import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { errorMessage, fieldErrors } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'

const schema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(150),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.enum(['guest', 'host']),
})

export default function Register() {
  usePageTitle('Crear cuenta')
  const { register } = useAuth()
  const navigate = useNavigate()
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { username: '', email: '', password: '', role: 'guest' } })

  async function onSubmit(values) {
    try {
      const user = await register(values)
      toast.success('¡Cuenta creada!')
      navigate(user.role === 'host' ? '/account' : '/', { replace: true })
    } catch (e) {
      const errs = fieldErrors(e)
      Object.entries(errs).forEach(([name, message]) => form.setError(name, { message }))
      if (!Object.keys(errs).length) toast.error(errorMessage(e))
    }
  }

  const field = (name, label, props = {}, hint) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input {...props} {...field} /></FormControl>
        {hint && <FormDescription>{hint}</FormDescription>}
        <FormMessage />
      </FormItem>
    )} />
  )

  return (
    <div className="mx-auto flex max-w-md px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>Reserva experiencias o publica las tuyas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
              {field('username', 'Usuario', { autoComplete: 'username' })}
              {field('email', 'Correo', { type: 'email', autoComplete: 'email' })}
              {field('password', 'Contraseña', { type: 'password', autoComplete: 'new-password' }, 'Al menos 8 caracteres, no solo números.')}
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiero…</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="guest">Reservar experiencias (huésped)</SelectItem>
                      <SelectItem value="host">Publicar ofertas (anfitrión)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creando…' : 'Crear cuenta'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-primary underline">Ingresa</Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
