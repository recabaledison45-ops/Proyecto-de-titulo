import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import RequireAuth from '@/components/RequireAuth'
import { Skeleton } from '@/components/ui/skeleton'

const Home = lazy(() => import('@/pages/Home'))
const Favorites = lazy(() => import('@/pages/Favorites'))
const Explore = lazy(() => import('@/pages/Explore'))
const ListingDetail = lazy(() => import('@/pages/ListingDetail'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const MyBookings = lazy(() => import('@/pages/MyBookings'))
const Account = lazy(() => import('@/pages/Account'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const Loading = () => (
  <div className="mx-auto max-w-5xl space-y-4 p-6" role="status" aria-label="Cargando">
    <Skeleton className="h-10 w-1/3" />
    <Skeleton className="h-64 w-full" />
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="listings/:id" element={<ListingDetail />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
          <Route path="account" element={<RequireAuth role="host"><Account /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </ErrorBoundary>
    </Suspense>
  )
}
