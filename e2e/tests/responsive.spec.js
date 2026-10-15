import { devices } from '@playwright/test'
import { expect, test } from './fixtures.js'

test.use({ ...devices['Pixel 7'], viewport: { width: 390, height: 844 } })

const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

test.describe('Móvil (390 px)', () => {
  test('portada sin desborde horizontal', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Mejor valoradas')).toBeVisible()
    expect(await sinDesborde(page)).toBe(true)
  })

  test('detalle sin desborde horizontal', async ({ page }) => {
    await page.goto('/listings/1')
    await expect(page.locator('#reservar')).toBeVisible()
    expect(await sinDesborde(page)).toBe(true)
  })

  test('Explorar lista resultados y alterna con el mapa', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.locator('section[aria-label=Resultados] article').first()).toBeVisible()
    await page.getByRole('button', { name: /Mapa/ }).click()
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })
})
