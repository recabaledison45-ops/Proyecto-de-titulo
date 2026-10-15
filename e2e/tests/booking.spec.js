import { expect, login, logout, test } from './fixtures.js'

// Flujo completo con usuarios demo: huésped reserva → anfitrión ve la reserva recibida.
test.describe.serial('Autenticación y reservas', () => {
  test('credenciales incorrectas muestran un error y no inician sesión', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[autocomplete=username]').fill('huesped')
    await page.locator('input[autocomplete=current-password]').fill('clave-incorrecta')
    await page.locator('button[type=submit]').click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('[role=alert], [data-sonner-toast]').first()).toBeVisible()
  })

  test('registro de un nuevo huésped', async ({ page }) => {
    const user = `huesped${Date.now()}`
    await page.goto('/register')
    await page.locator('input[autocomplete=username]').fill(user)
    await page.locator('input[type=email]').fill(`${user}@example.com`)
    await page.locator('input[autocomplete=new-password]').first().fill('Contr4sena-larga-9')
    await page.locator('button[type=submit]').click()
    await page.waitForFunction(() => location.pathname !== '/register')
    await expect(page.getByRole('button', { name: 'Menú de cuenta' })).toBeVisible()
  })

  test('el huésped reserva la Casona patrimonial y la ve en "Mis reservas"', async ({ page }) => {
    await login(page, 'huesped')
    await page.getByRole('button', { name: 'Menú de cuenta' }).click()
    await expect(page.getByRole('menu').getByText('Mis reservas')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.goto('/explore?q=Casona')
    await page.locator('section[aria-label=Resultados] article a').first().click()
    await expect(page.locator('#reservar')).toBeVisible()

    await page.locator('#reservar button.rdp-button_next, #reservar button[aria-label*="iguiente"]').first().click()
    const days = page.locator('#reservar td[data-day] button:not([disabled])')
    expect(await days.count()).toBeGreaterThan(5)
    await days.nth(3).click()
    await days.nth(5).click()
    await expect(page.locator('#reservar').getByText('Total')).toBeVisible()

    await page.getByRole('button', { name: 'Reservar' }).click()
    await expect(page).toHaveURL(/\/bookings$/)
    await expect(page.getByText(/Reserva #/).first()).toBeVisible()
    await expect(page.getByText('Casona patrimonial en Talca').first()).toBeVisible()
  })

  test('el anfitrión ve su panel con ofertas y reservas recibidas', async ({ page }) => {
    await login(page, 'anfitrion')
    await page.goto('/account')
    await expect(page.getByText('Reservas recibidas')).toBeVisible()
    await page.getByRole('tab', { name: 'Mis ofertas' }).click()
    await expect(page.locator('a[href^="/listings/"]').first()).toBeVisible()
    expect(await page.locator('a[href^="/listings/"]').count()).toBeGreaterThanOrEqual(9)
    await page.getByRole('tab', { name: 'Publicar oferta' }).click()
    await expect(page.locator('form').first()).toBeVisible()
    await logout(page)
  })

  test('las páginas privadas redirigen a ingresar cuando no hay sesión', async ({ page }) => {
    await page.goto('/bookings')
    await expect(page).toHaveURL(/\/login/)
  })
})
