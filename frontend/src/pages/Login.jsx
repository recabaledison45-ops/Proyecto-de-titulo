import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { errorMessage } from '@/api/client'
import AuthShell from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'

const schema = z.object({
  username: z.string().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export default function Login() {
  usePageTitle('Ingresar')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } })

  async function onSubmit(values) {
    try {
      await login(values)
      navigate(location.state?.from || '/', { replace: true })
    } catch (e) {
      const status = e.response?.status
      toast.error(status === 401 ? 'Usuario o contraseña incorrectos.' : status === 429 ? 'Demasiados intentos. Espera un minuto.' : errorMessage(e))
    }
  }

  return (
    <AuthShell
      title="Te damos la bienvenida"
      subtitle="Ingresa para reservar o gestionar tus ofertas."
      footer={<>¿No tienes cuenta? <Link to="/register" className="font-semibold text-foreground underline">Regístrate</Link></>}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormField control={form.control} name="username" render={({ field }) => (
            <FormItem>
              <FormLabel>Usuario</FormLabel>
              <FormControl><Input className="h-12" autoComplete="username" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl><Input className="h-12" type="password" autoComplete="current-password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </Form>
      {import.meta.env.DEV && (
        <p className="mt-6 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          Modo desarrollo · usuarios de prueba (tras <code>seed_demo</code>): <strong>huesped</strong>, <strong>anfitrion</strong> o <strong>admin</strong>, clave <strong>demo1234</strong>.
        </p>
      )}
    </AuthShell>
  )
}
