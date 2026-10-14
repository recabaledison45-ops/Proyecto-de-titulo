import { api } from './client'

export const paymentInfo = (bookingId) => api.get(`/bookings/${bookingId}/payment-info/`).then((r) => r.data)
export const pay = (booking) => api.post('/payments/', { booking }).then((r) => r.data)
export const confirmPayment = (id) => api.post(`/payments/${id}/confirm/`).then((r) => r.data)
