// Pruebas de carga de W Experiencias (k6) · F-61
//
// Uso:
//   k6 run -e BASE_URL=https://api.midominio.cl/api/v1 -e PROFILE=smoke wexperiencias.js
//   PROFILE = smoke (1 usuario, 30 s) | load (50 usuarios, ~6 min) | stress (hasta 200 usuarios, ~9 min)
//
// IMPORTANTE: el backend limita las peticiones por IP (300/min anónimo). Desde una sola máquina k6 se
// toparía con 429 y mediría el límite, no el rendimiento. Para correr `load` o `stress` use un entorno de
// pruebas con THROTTLE_RATE_ANON=100000/min y THROTTLE_RATE_USER=100000/min (ver docs/PRUEBAS-CARGA.md).
// No ejecute `load`/`stress` contra producción sin avisar: crea reservas reales de usuarios demo.
import { check, group, sleep } from 'k6'
import http from 'k6/http'
import { Counter, Trend } from 'k6/metrics'

const BASE = (__ENV.BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, '')
const PROFILE = __ENV.PROFILE || 'smoke'
const GUEST_USER = __ENV.GUEST_USER || 'huesped'
const GUEST_PASS = __ENV.GUEST_PASS || 'demo1234'

const profiles = {
  smoke: {
    browse: { executor: 'constant-vus', vus: 1, duration: '30s', exec: 'browse' },
    book: { executor: 'constant-vus', vus: 1, duration: '30s', exec: 'book' },
  },
  load: {
    browse: {
      executor: 'ramping-vus', exec: 'browse', startVUs: 0,
      stages: [{ duration: '1m', target: 45 }, { duration: '4m', target: 45 }, { duration: '1m', target: 0 }],
    },
    book: {
      executor: 'ramping-vus', exec: 'book', startVUs: 0,
      stages: [{ duration: '1m', target: 5 }, { duration: '4m', target: 5 }, { duration: '1m', target: 0 }],
    },
  },
  stress: {
    browse: {
      executor: 'ramping-vus', exec: 'browse', startVUs: 0,
      stages: [{ duration: '2m', target: 90 }, { duration: '3m', target: 180 }, { duration: '3m', target: 180 }, { duration: '1m', target: 0 }],
    },
    book: {
      executor: 'ramping-vus', exec: 'book', startVUs: 0,
      stages: [{ duration: '2m', target: 10 }, { duration: '3m', target: 20 }, { duration: '3m', target: 20 }, { duration: '1m', target: 0 }],
    },
  },
}

export const options = {
  scenarios: profiles[PROFILE],
  thresholds: {
    // Criterios de aceptación (se documentan en docs/PRUEBAS-CARGA.md)
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:health}': ['p(95)<300'],
    'http_req_duration{endpoint:list}': ['p(95)<800', 'p(99)<2000'],
    'http_req_duration{endpoint:search}': ['p(95)<1000'],
    'http_req_duration{endpoint:detail}': ['p(95)<800'],
    'http_req_duration{endpoint:booking}': ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
}

// 201 creada · 400 datos/capacidad · 409 fechas ocupadas: respuestas esperadas del flujo de reservas.
const bookingStatuses = http.expectedStatuses(201, 400, 409)
const bookingOutcome = new Counter('booking_outcome')
const bookingDuration = new Trend('booking_duration', true)

export function setup() {
  const health = http.get(`${BASE}/health/`)
  if (health.status !== 200) throw new Error(`El backend no responde en ${BASE}/health/ (HTTP ${health.status})`)

  const login = http.post(`${BASE}/auth/login/`, JSON.stringify({ username: GUEST_USER, password: GUEST_PASS }), {
    headers: { 'Content-Type': 'application/json' },
  })
  if (login.status !== 200) throw new Error(`No se pudo iniciar sesión como ${GUEST_USER} (HTTP ${login.status}). ¿Hay datos demo?`)

  const listings = http.get(`${BASE}/listings/?page_size=200`).json('results')
  if (!listings || !listings.length) throw new Error('No hay ofertas publicadas para probar')
  return { token: login.json('access'), ids: listings.map((l) => l.id) }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const iso = (d) => d.toISOString().slice(0, 10)

// ~95 % del tráfico real: visitantes que navegan, buscan y abren fichas.
export function browse(data) {
  group('portada y explorar', () => {
    const r = http.get(`${BASE}/listings/?page_size=24&ordering=-rating`, { tags: { endpoint: 'list' } })
    check(r, { 'listado 200': (x) => x.status === 200, 'listado trae resultados': (x) => x.json('results').length > 0 })
  })
  sleep(1 + Math.random() * 2)

  group('búsqueda', () => {
    const q = pick(['kayak', 'Talca', 'Casona', 'vino', 'Constitución'])
    const r1 = http.get(`${BASE}/listings/?q=${encodeURIComponent(q)}`, { tags: { endpoint: 'search' } })
    const r2 = http.get(`${BASE}/listings/?category=${pick(['lodging', 'package', 'guide', 'activity'])}&guests=2`, { tags: { endpoint: 'search' } })
    const r3 = http.get(`${BASE}/listings/?lat_min=-36.2&lat_max=-34.8&lng_min=-72.6&lng_max=-70.9`, { tags: { endpoint: 'search' } })
    check(r1, { 'búsqueda libre 200': (x) => x.status === 200 })
    check(r2, { 'filtro categoría 200': (x) => x.status === 200 })
    check(r3, { 'búsqueda por mapa 200': (x) => x.status === 200 })
  })
  sleep(1 + Math.random() * 2)

  group('ficha de oferta', () => {
    const id = pick(data.ids)
    const d = http.get(`${BASE}/listings/${id}/`, { tags: { endpoint: 'detail' } })
    const b = http.get(`${BASE}/listings/${id}/booked-dates/`, { tags: { endpoint: 'detail' } })
    check(d, { 'detalle 200': (x) => x.status === 200 })
    check(b, { 'fechas ocupadas 200': (x) => x.status === 200 })
  })
  sleep(2 + Math.random() * 3)

  if (Math.random() < 0.1) {
    const h = http.get(`${BASE}/health/`, { tags: { endpoint: 'health' } })
    check(h, { 'health 200': (x) => x.status === 200 })
  }
}

// ~5 % del tráfico: huéspedes con sesión que consultan sus reservas y reservan.
export function book(data) {
  const auth = { headers: { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json' } }

  const mine = http.get(`${BASE}/bookings/?as=guest`, { ...auth, tags: { endpoint: 'list' } })
  check(mine, { 'mis reservas 200': (x) => x.status === 200 })
  sleep(1 + Math.random() * 2)

  const start = new Date(Date.now() + (30 + Math.floor(Math.random() * 330)) * 86400000)
  const end = new Date(start.getTime() + (1 + Math.floor(Math.random() * 3)) * 86400000)
  const payload = JSON.stringify({ listing: pick(data.ids), check_in: iso(start), check_out: iso(end), guests: 1 })
  const r = http.post(`${BASE}/bookings/`, payload, { ...auth, tags: { endpoint: 'booking' }, responseCallback: bookingStatuses })
  bookingOutcome.add(1, { status: String(r.status) })
  bookingDuration.add(r.timings.duration)
  check(r, { 'reserva responde 201/400/409 (nunca 5xx)': (x) => [201, 400, 409].includes(x.status) })
  sleep(3 + Math.random() * 4)
}
