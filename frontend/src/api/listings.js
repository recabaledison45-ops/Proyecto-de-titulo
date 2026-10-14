import { api } from './client'

const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))

export const searchListings = (params, signal) =>
  api.get('/listings/', { params: clean({ page_size: 200, ...params }), signal }).then((r) => r.data)
export const myListings = () => api.get('/listings/', { params: { mine: true, page_size: 200 } }).then((r) => r.data.results)
export const getListing = (id) => api.get(`/listings/${id}/`).then((r) => r.data)
export const bookedDates = (id) => api.get(`/listings/${id}/booked-dates/`).then((r) => r.data)
export const saveListing = (id, payload) =>
  (id ? api.patch(`/listings/${id}/`, payload) : api.post('/listings/', payload)).then((r) => r.data)
export const deactivateListing = (id) => api.delete(`/listings/${id}/`)
