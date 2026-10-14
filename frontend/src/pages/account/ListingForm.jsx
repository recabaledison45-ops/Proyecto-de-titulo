import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { toast } from 'sonner'
import { z } from 'zod'
import { errorMessage, fieldErrors } from '@/api/client'
import { getListing, saveListing } from '@/api/listings'
import { MAULE_CENTER, TILE_ATTRIBUTION, TILE_URL, pickIcon } from '@/components/mapConfig'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { BOOKING_MODES, CATEGORIES, CATEGORY_OPTIONS, DIFFICULTY_OPTIONS } from '@/lib/labels'

const MAX_IMAGE = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const num = (v) => v !== '' && !Number.isNaN(Number(v))

const schema = z.object({
  category: z.enum(['lodging', 'package', 'guide', 'activity']),
  title: z.string().min(3, 'Mínimo 3 caracteres').max(160),
  description: z.string().max(5000),
  city: z.string().min(2, 'Indica la ciudad').max(100),
  address: z.string().max(255),
  price_per_night: z.string().refine((v) => num(v) && Number(v) > 0, 'Ingresa un precio mayor a 0'),
  max_guests: z.string().refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 500, 'Ingresa una capacidad de 1 o más'),
  booking_mode: z.enum(['exclusive', 'shared']),
  duration_hours: z.string().refine((v) => v === '' || (num(v) && Number(v) > 0 && Number(v) < 1000), 'Duración inválida'),
  difficulty: z.enum(['none', 'easy', 'medium', 'hard']),
  dress_code: z.string().max(255),
  wellness_benefits: z.string().max(3000),
  photo_url: z.string().refine((v) => v === '' || /^https?:\/\/.+/.test(v), 'Debe ser una URL http(s)'),
  latitude: z.number().nullable().refine((v) => v !== null, 'Marca la ubicación en el mapa'),
  longitude: z.number().nullable().refine((v) => v !== null, 'Marca la ubicación en el mapa'),
})

function ClickToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function FormInner({ listing, onSaved }) {
  const [image, setImage] = useState(null)
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : listing?.image_url || ''), [image, listing])
  useEffect(() => () => { if (image) URL.revokeObjectURL(preview) }, [image, preview])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      category: listing?.category ?? 'activity',
      title: listing?.title ?? '',
      description: listing?.description ?? '',
      city: listing?.city ?? '',
      address: listing?.address ?? '',
      price_per_night: listing ? String(Number(listing.price_per_night)) : '',
      max_guests: listing ? String(listing.max_guests) : '',
      booking_mode: listing?.booking_mode ?? 'exclusive',
      duration_hours: listing?.duration_hours ? String(Number(listing.duration_hours)) : '',
      difficulty: listing?.difficulty || 'none',
      dress_code: listing?.dress_code ?? '',
      wellness_benefits: listing?.wellness_benefits ?? '',
      photo_url: listing?.image_url && !listing.image_url.includes('/media/') ? listing.image_url : '',
      latitude: listing?.latitude ?? null,
      longitude: listing?.longitude ?? null,
    },
  })
  const [category, mode, lat, lng] = useWatch({ control: form.control, name: ['category', 'booking_mode', 'latitude', 'longitude'] })
  const unit = mode === 'shared' ? 'por persona y día' : CATEGORIES[category].unit

  function pickImage(e) {
    const file = e.target.files?.[0]
    if (!file) return setImage(null)
    if (!IMAGE_TYPES.includes(file.type)) { toast.error('Formato no permitido: usa JPEG, PNG o WEBP.'); e.target.value = ''; return }
    if (file.size > MAX_IMAGE) { toast.error('La imagen no puede superar los 2 MB.'); e.target.value = ''; return }
    setImage(file)
  }

  async function onSubmit(v) {
    const fields = {
      category: v.category, title: v.title, description: v.description, city: v.city, address: v.address,
      latitude: v.latitude, longitude: v.longitude, price_per_night: v.price_per_night, max_guests: v.max_guests,
      booking_mode: v.booking_mode, difficulty: v.difficulty === 'none' ? '' : v.difficulty, dress_code: v.dress_code,
      wellness_benefits: v.wellness_benefits, photo_url: v.photo_url,
    }
    let body
    if (image) {
      body = new FormData()
      Object.entries(fields).forEach(([k, val]) => body.append(k, val))
      body.append('duration_hours', v.duration_hours) // '' se interpreta como nulo
      body.append('image', image)
    } else {
      body = { ...fields, duration_hours: v.duration_hours === '' ? null : v.duration_hours }
    }
    try {
      await saveListing(listing?.id, body)
      toast.success(listing ? 'Oferta actualizada.' : 'Oferta publicada. Ya aparece en el mapa.')
      onSaved()
    } catch (e) {
      const errs = fieldErrors(e)
      Object.entries(errs).forEach(([name, message]) => form.setError(name, { message }))
      toast.error(Object.keys(errs).length ? 'Revisa los campos marcados.' : errorMessage(e))
    }
  }

  const input = (name, label, { hint, Comp = Input, ...props } = {}) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Comp {...props} {...field} /></FormControl>
        {hint && <FormDescription>{hint}</FormDescription>}
        <FormMessage />
      </FormItem>
    )} />
  )
  const select = (name, label, options, hint) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select value={field.value} onValueChange={field.onChange}>
          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
          <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        {hint && <FormDescription>{hint}</FormDescription>}
        <FormMessage />
      </FormItem>
    )} />
  )

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>{listing ? 'Editar oferta' : 'Publicar oferta'}</CardTitle>
        <CardDescription>Alojamientos, paquetes, guías y actividades se publican igual: elige la categoría y completa la ficha.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              {select('category', 'Categoría', CATEGORY_OPTIONS)}
              {select('booking_mode', 'Modo de reserva', Object.entries(BOOKING_MODES).map(([value, label]) => ({ value, label })),
                'Compartida: varias reservas por fecha hasta agotar los cupos (tours grupales).')}
            </div>
            {input('title', 'Título')}
            {input('description', 'Descripción', { Comp: Textarea, rows: 4 })}
            <div className="grid gap-4 sm:grid-cols-2">
              {input('city', 'Ciudad o localidad')}
              {input('address', 'Dirección o punto de encuentro')}
              {input('price_per_night', `Precio (CLP, ${unit})`, { type: 'number', min: 1, step: 'any', inputMode: 'decimal' })}
              {input('max_guests', 'Capacidad (personas)', { type: 'number', min: 1, step: 1 })}
            </div>

            <fieldset className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <legend className="px-2 text-sm font-semibold">Ficha técnica</legend>
              {input('duration_hours', 'Duración (horas)', { type: 'number', min: 0, step: 0.5 })}
              {select('difficulty', 'Dificultad', [{ value: 'none', label: 'No aplica' }, ...DIFFICULTY_OPTIONS])}
              {input('dress_code', 'Vestimenta recomendada')}
              <div className="sm:col-span-2">{input('wellness_benefits', 'Beneficios de bienestar', { Comp: Textarea, rows: 3 })}</div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="image">Imagen de portada (JPEG, PNG o WEBP, máx. 2 MB)</FormLabel>
                <Input id="image" type="file" accept={IMAGE_TYPES.join(',')} onChange={pickImage} />
              </FormItem>
              {input('photo_url', 'o URL de la foto', { placeholder: 'https://…', hint: 'Si subes una imagen, se usa esa.' })}
              {preview && <img src={preview} alt="Vista previa de la portada" className="h-40 w-full rounded-lg object-cover sm:col-span-2" />}
            </div>

            <FormItem>
              <FormLabel>Ubicación: haz clic en el mapa</FormLabel>
              <div className="h-72 overflow-hidden rounded-xl border">
                <MapContainer center={lat != null ? [lat, lng] : MAULE_CENTER} zoom={lat != null ? 11 : 8} className="h-full w-full">
                  <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                  <ClickToPick onPick={(la, lo) => {
                    form.setValue('latitude', Number(la.toFixed(6)), { shouldValidate: true })
                    form.setValue('longitude', Number(lo.toFixed(6)), { shouldValidate: true })
                  }} />
                  {lat != null && <Marker position={[lat, lng]} icon={pickIcon} />}
                </MapContainer>
              </div>
              <p className="text-xs text-muted-foreground">{lat != null ? `Latitud ${lat}, longitud ${lng}` : 'Aún no marcas una ubicación.'}</p>
              {form.formState.errors.latitude && <p role="alert" className="text-xs text-destructive">{form.formState.errors.latitude.message}</p>}
            </FormItem>

            <Button type="submit" size="lg" className="w-fit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando…' : listing ? 'Guardar cambios' : 'Publicar oferta'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// Al editar se pide el detalle completo (la lista no trae descripción ni ficha completa).
export default function ListingForm({ listing, onSaved }) {
  const [detail, setDetail] = useState(null)
  useEffect(() => {
    if (!listing) return
    getListing(listing.id).then(setDetail).catch((e) => toast.error(errorMessage(e)))
  }, [listing])

  if (listing && !detail) return <Skeleton className="h-96 w-full max-w-4xl" />
  return <FormInner listing={listing ? detail : null} onSaved={onSaved} />
}
