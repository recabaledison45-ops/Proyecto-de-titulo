import { api } from './client'

export const createBooking = (payload) => api.post('/bookings/', payload).then((r) => r.data)
export const listBookings = (as, status) =>
  api.get('/bookings/', { params: { as, status: status || undefined, page_size: 100 } }).then((r) => r.data.results)
export const cancelBooking = (id, reason = '') => api.post(`/bookings/${id}/cancel/`, { reason }).then((r) => r.data)
export const rejectBooking = (id, reason) => api.post(`/bookings/${id}/reject/`, { reason }).then((r) => r.data)
export const completeBooking = (id) => api.post(`/bookings/${id}/complete/`).then((r) => r.data)
export const saveNotes = (id, host_notes) => api.patch(`/bookings/${id}/notes/`, { host_notes }).then((r) => r.data)
