import axios from 'axios'

/* global __API_BASE__ */
// Dirección de la API. Por defecto es relativa (/api/v1): el mismo dominio reenvía al backend
// (Vite en desarrollo, Nginx en AWS, y en Vercel la regla de vercel.json). Ver vite.config.js.
export const baseURL = __API_BASE__

// Los tokens viven en localStorage (decisión conocida: ver README; mitigada con access de 30 min y rotación).
export const tokens = {
  get access() { return localStorage.getItem('access') },
  get refresh() { return localStorage.getItem('refresh') },
  set(access, refresh) {
    if (access) localStorage.setItem('access', access)
    if (refresh) localStorage.setItem('refresh', refresh)
  },
  clear() { localStorage.removeItem('access'); localStorage.removeItem('refresh') },
}

export const api = axios.create({ baseURL })

let onAuthLost = null
export const setAuthLostHandler = (fn) => { onAuthLost = fn }

api.interceptors.request.use((config) => {
  const token = tokens.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Una sola renovación a la vez: las peticiones simultáneas que reciben 401 esperan la misma promesa.
let refreshing = null
function refreshAccess() {
  if (!refreshing) {
    refreshing = axios
      .post(`${baseURL}/auth/refresh/`, { refresh: tokens.refresh })
      .then(({ data }) => { tokens.set(data.access, data.refresh); return data.access })
      .finally(() => { refreshing = null })
  }
  return refreshing
}

// El plan gratuito del backend "duerme" tras 15 min sin uso y tarda cerca de un minuto en despertar:
// las lecturas se reintentan solas en vez de mostrar un error.
const RETRY_DELAYS = [3000, 6000, 10000, 15000]
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error
    const asleep = !response || [502, 503, 504].includes(response.status)
    if (asleep && config && (config.method ?? 'get') === 'get' && error.code !== 'ERR_CANCELED') {
      const attempt = config._attempt ?? 0
      if (attempt < RETRY_DELAYS.length) {
        config._attempt = attempt + 1
        await wait(RETRY_DELAYS[attempt])
        return api(config)
      }
    }
    const isAuthCall = config?.url?.includes('/auth/')
    if (response?.status === 401 && config && !config._retried && !isAuthCall && tokens.refresh) {
      config._retried = true
      try {
        const access = await refreshAccess()
        config.headers.Authorization = `Bearer ${access}`
        return api(config)
      } catch {
        tokens.clear()
        onAuthLost?.()
      }
    }
    return Promise.reject(error)
  },
)

// Errores del backend → objeto {campo: mensaje} y mensaje legible.
export function fieldErrors(error) {
  const data = error?.response?.data
  if (!data || typeof data !== 'object' || 'detail' in data) return {}
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]))
}

export function errorMessage(error, fallback = 'Ocurrió un error. Intente nuevamente.') {
  if (!error?.response) return 'No hay conexión con el servidor.'
  if ([502, 503, 504].includes(error.response.status)) return 'El servidor está iniciando. Espera un momento y vuelve a intentar.'
  const data = error.response.data
  if (data?.detail) return data.detail
  const first = Object.values(fieldErrors(error))[0]
  return first || fallback
}
