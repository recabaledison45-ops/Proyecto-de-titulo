import { expect, test } from './fixtures.js'

test.describe('Navegación pública', () => {
  test('la portada muestra titular y tarjetas de ofertas', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Mejor valoradas')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Vive experiencias')
    expect(await page.locator('article').count()).toBeGreaterThanOrEqual(8)
  })

  test('el buscador de la portada navega a Explorar con el destino', async ({ page }) => {
    await page.goto('/')
    await page.locator('#s-where').fill('Talca')
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page).toHaveURL(/\/explore\?.*dest=talca/)
    await expect(page.locator('section[aria-label=Resultados] article').first()).toBeVisible()
  })

  test('la búsqueda libre "kayak" devuelve una oferta', async ({ page }) => {
    await page.goto('/explore?q=kayak')
    await expect(page.locator('section[aria-label=Resultados] article')).toHaveCount(1)
  })

  test('el chip "Guías" filtra por categoría y actualiza la URL', async ({ page }) => {
    await page.goto('/explore')
    await expect(page.locator('section[aria-label=Resultados] article').first()).toBeVisible()
    await page.getByRole('tab', { name: 'Guías' }).click()
    await expect(page).toHaveURL(/category=guide/)
    await expect(page.locator('section[aria-label=Resultados] article')).toHaveCount(2)
  })

  test('fechas inválidas (salida antes de llegada) muestran un error', async ({ page }) => {
    await page.goto('/')
    await page.locator('#s-in').fill('2030-05-10')
    await page.locator('#s-out').fill('2030-05-08')
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page.getByRole('alert')).toHaveCount(1)
  })

  test('el detalle muestra el widget de reserva y permite guardar en favoritos', async ({ page }) => {
    await page.goto('/explore')
    await page.locator('section[aria-label=Resultados] article a').first().click()
    await expect(page.locator('#reservar')).toBeVisible()
    await page.getByRole('button', { name: 'Guardar en favoritos' }).click()
    await expect(page.locator('button[aria-pressed=true]').first()).toBeVisible()
    await page.goto('/favorites')
    await expect(page.locator('article')).toHaveCount(1)
  })

  test('una ruta inexistente muestra la página 404', async ({ page }) => {
    await page.goto('/esta-ruta-no-existe')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page).toHaveTitle(/no encontrada/i)
  })
})
