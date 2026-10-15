import AxeBuilder from '@axe-core/playwright'
import { expect, login, test } from './fixtures.js'

// Accesibilidad automatizada (WCAG 2.1 A/AA). Falla ante cualquier infracción "serious" o "critical".
// Las pruebas automáticas cubren ~30-40 % de WCAG: complementan, no reemplazan, la revisión manual (docs/ACCESIBILIDAD-SEO.md).
async function auditar(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const graves = violations.filter((v) => ['serious', 'critical'].includes(v.impact))
  const detalle = graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
  expect(detalle, detalle.join('\n')).toEqual([])
}

const paginas = [
  ['portada', '/', 'text=Mejor valoradas'],
  ['explorar', '/explore', 'section[aria-label=Resultados] article'],
  ['detalle de oferta', '/listings/1', '#reservar'],
  ['ingresar', '/login', 'form'],
  ['crear cuenta', '/register', 'form'],
]

for (const [nombre, ruta, listo] of paginas) {
  test(`axe: ${nombre} sin infracciones graves`, async ({ page }) => {
    await page.goto(ruta)
    await page.locator(listo).first().waitFor()
    await auditar(page)
  })
}

test('axe: panel del anfitrión sin infracciones graves', async ({ page }) => {
  await login(page, 'anfitrion')
  await page.goto('/account')
  await page.getByText('Reservas recibidas').waitFor()
  await auditar(page)
})

test('se puede operar el buscador solo con teclado', async ({ page }) => {
  await page.goto('/')
  await page.locator('#s-where').focus()
  await page.keyboard.type('Talca')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/explore/)
})
