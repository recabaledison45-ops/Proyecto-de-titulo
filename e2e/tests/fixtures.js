import { test as base, expect } from '@playwright/test'

// 1x1 PNG gris-verdoso usado como tesela del mapa.
const TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO0qKj4DwAEWgJnGPsMkQAAAABJRU5ErkJggg==',
  'base64',
)

const photoSvg = (seed) => {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},55%,72%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360},45%,38%)"/></linearGradient></defs><rect width="900" height="600" fill="url(#g)"/></svg>`
}

/**
 * Las pruebas no deben depender de internet: las fotos (picsum) y las teselas del mapa se simulan.
 * Los datos de la API sí son reales (backend de Django con datos demo).
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/picsum.photos/**', (route) => {
      const seed = /\/seed\/([^/]+)/.exec(route.request().url())?.[1] ?? 'x'
      return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: photoSvg(seed) })
    })
    await page.route(/https:\/\/[^/]*(tile\.openstreetmap\.org|opentopomap\.org|arcgisonline\.com|maptiler\.com)\/.*/, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: TILE }),
    )
    await use(page)
  },
})

export { expect }

export async function login(page, username, password = 'demo1234') {
  await page.goto('/login')
  await page.locator('input[autocomplete=username]').fill(username)
  await page.locator('input[autocomplete=current-password]').fill(password)
  await page.locator('button[type=submit]').click()
  await page.waitForFunction(() => location.pathname !== '/login')
}

export async function logout(page) {
  await page.getByRole('button', { name: 'Menú de cuenta' }).click()
  await page.getByRole('menuitem', { name: /Cerrar sesión/ }).click()
}
