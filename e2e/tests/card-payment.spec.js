import { expect, login, test } from './fixtures.js'

// Pago con tarjeta de punta a punta: reserva → Webpay → retorno → comprobante → reserva confirmada.
// Webpay se reemplaza por e2e/mock-webpay.mjs (misma API que Transbank); todo lo demás es real.
const API = `http://127.0.0.1:${process.env.E2E_API_PORT || '8765'}/api/v1`

async function crearReserva(request, diasDesdeHoy) {
  const { access } = await (await request.post(`${API}/auth/login/`, { data: { username: 'huesped', password: 'demo1234' } })).json()
  const fecha = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
  const res = await request.post(`${API}/bookings/`, {
    headers: { Authorization: `Bearer ${access}` },
    data: { listing: 2, check_in: fecha(diasDesdeHoy), check_out: fecha(diasDesdeHoy + 2), guests: 1 },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()).id
}

async function irAWebpay(page, id) {
  await login(page, 'huesped')
  await page.goto('/bookings')
  const reserva = page.locator(`[data-booking-id="${id}"]`)
  await reserva.getByRole('button', { name: 'Pagar' }).click()
  await expect(page.getByRole('note')).toContainText('Modo de prueba')
  await page.getByRole('button', { name: /con tarjeta/ }).click()
  await expect(page).toHaveTitle('Webpay simulado')
  return reserva
}

test.describe.serial('Pago con tarjeta (Webpay Plus)', () => {
  test('pago aprobado: comprobante y reserva confirmada', async ({ page, request }) => {
    const id = await crearReserva(request, 200)
    const reserva = await irAWebpay(page, id)
    await page.locator('#approve').click()

    await expect(page).toHaveURL(/\/payments\/result\?status=success/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pago aprobado')
    await expect(page.getByText('1213')).toBeVisible() // código de autorización
    await expect(page.getByText('terminada en')).toContainText('6623')

    await page.getByRole('link', { name: 'Ver mis reservas' }).click()
    await expect(reserva.getByText('Pagado con tarjeta terminada en 6623')).toBeVisible()
    await expect(reserva.getByRole('button', { name: 'Pagar' })).toHaveCount(0)
  })

  test('tarjeta rechazada: sin cargo, la reserva sigue pendiente y se puede reintentar', async ({ page, request }) => {
    const id = await crearReserva(request, 210)
    const reserva = await irAWebpay(page, id)
    await page.locator('#reject').click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('rechazado')
    await page.getByRole('link', { name: /reintentar/ }).click()
    await expect(reserva.getByRole('button', { name: 'Pagar' })).toBeVisible()

    // Reintento exitoso
    await reserva.getByRole('button', { name: 'Pagar' }).click()
    await page.getByRole('button', { name: /con tarjeta/ }).click()
    await page.locator('#approve').click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pago aprobado')
  })

  test('anular en Webpay: vuelve sin cargo', async ({ page, request }) => {
    const id = await crearReserva(request, 220)
    await irAWebpay(page, id)
    await page.locator('#abort').click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cancelaste el pago')
  })

  test('el resultado no se puede falsificar cambiando la dirección', async ({ page, request }) => {
    const id = await crearReserva(request, 230)
    await login(page, 'huesped')
    await page.goto(`/payments/result?status=success&booking=${id}`)
    await expect(page.getByRole('heading', { level: 1 })).not.toContainText('Pago aprobado')
  })
})
