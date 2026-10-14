import { api } from './client'

export const register = (payload) => api.post('/auth/register/', payload).then((r) => r.data)
export const login = (payload) => api.post('/auth/login/', payload).then((r) => r.data)
export const me = () => api.get('/users/me/').then((r) => r.data)
export const updateMe = (payload) => api.patch('/users/me/', payload).then((r) => r.data)
