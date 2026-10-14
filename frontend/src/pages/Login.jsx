import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { errorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="mx-auto flex max-w-md px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Ingresar</CardTitle>
          <CardDescription>Accede para reservar o gestionar tus ofertas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl><Input autoComplete="username" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿No tienes cuenta? <Link to="/register" className="font-medium text-primary underline">Regístrate</Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
