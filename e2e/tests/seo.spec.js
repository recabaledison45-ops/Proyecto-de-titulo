import { expect, test } from './fixtures.js'

test.describe('SEO básico', () => {
  test('la portada tiene idioma, título, descripción y un único h1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    expect(await page.title()).toMatch(/W Experiencias/)
    const descripcion = await page.locator('meta[name=description]').getAttribute('content')
    expect(descripcion.length).toBeGreaterThan(50)
    expect(descripcion.length).toBeLessThanOrEqual(300)
    await expect(page.locator('meta[name=viewport]')).toHaveCount(1)
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /index, follow/)
  })

  test('el detalle usa el título de la oferta y un canonical propio', async ({ page }) => {
    await page.goto('/listings/1')
    await page.locator('#reservar').waitFor()
    await expect(page.locator('h1')).toHaveCount(1)
    const h1 = (await page.locator('h1').innerText()).trim()
    expect(await page.title()).toContain(h1)
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/listings\/1$/)
  })

  test('las páginas privadas llevan noindex', async ({ page }) => {
    for (const ruta of ['/login', '/register', '/favorites']) {
      await page.goto(ruta)
      await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
    }
  })

  test('todas las imágenes de la portada tienen texto alternativo', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Mejor valoradas').waitFor()
    const sinAlt = await page.locator('img:not([alt])').count()
    expect(sinAlt).toBe(0)
  })
})
