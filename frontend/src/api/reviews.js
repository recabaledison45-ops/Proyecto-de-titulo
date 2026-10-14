import { api } from './client'

export const listReviews = (listing) => api.get('/reviews/', { params: { listing } }).then((r) => r.data)
export const createReview = (payload) => api.post('/reviews/', payload).then((r) => r.data)
