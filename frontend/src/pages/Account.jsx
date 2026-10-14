import { useState } from 'react'
import { BarChart3, CalendarCheck, List, PlusCircle, UserRound } from 'lucide-react'
import HostBookings from '@/pages/account/HostBookings'
import ListingForm from '@/pages/account/ListingForm'
import MyListings from '@/pages/account/MyListings'
import ProfileForm from '@/pages/account/ProfileForm'
import Reports from '@/pages/account/Reports'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Account() {
  usePageTitle('Mi cuenta')
  const [tab, setTab] = useState('bookings')
  const [editing, setEditing] = useState(null) // oferta en edición, o null para publicar una nueva
  const [listingsVersion, setListingsVersion] = useState(0)

  const edit = (listing) => { setEditing(listing); setTab('form') }
  const saved = () => { setEditing(null); setListingsVersion((v) => v + 1); setTab('listings') }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-semibold">Mi cuenta</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Secciones de mi cuenta">
          <TabsTrigger value="bookings"><CalendarCheck className="size-4" /> Reservas recibidas</TabsTrigger>
          <TabsTrigger value="listings"><List className="size-4" /> Mis ofertas</TabsTrigger>
          <TabsTrigger value="form" onClick={() => setEditing(null)}><PlusCircle className="size-4" /> {editing ? 'Editar oferta' : 'Publicar oferta'}</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="size-4" /> Reportes</TabsTrigger>
          <TabsTrigger value="profile"><UserRound className="size-4" /> Perfil</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings"><HostBookings /></TabsContent>
        <TabsContent value="listings"><MyListings key={listingsVersion} onEdit={edit} /></TabsContent>
        <TabsContent value="form"><ListingForm key={editing?.id ?? 'new'} listing={editing} onSaved={saved} /></TabsContent>
        <TabsContent value="reports"><Reports /></TabsContent>
        <TabsContent value="profile"><ProfileForm /></TabsContent>
      </Tabs>
    </div>
  )
}
