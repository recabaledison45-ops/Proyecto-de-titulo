import { api } from './client'

export const paymentInfo = (bookingId) => api.get(`/bookings/${bookingId}/payment-info/`).then((r) => r.data)
export const pay = (booking) => api.post('/payments/', { booking }).then((r) => r.data)
export const confirmPayment = (id) => api.post(`/payments/${id}/confirm/`).then((r) => r.data)
// Tarjeta (Webpay Plus): devuelve { payment, url, token }; luego hay que enviar al navegador a `url` (ver lib/webpay.js).
export const startWebpay = (booking) => api.post('/payments/webpay/', { booking }).then((r) => r.data)
