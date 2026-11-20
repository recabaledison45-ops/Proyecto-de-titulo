import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('/home/claude/proyecto-de-titulo/e2e/')
const { chromium } = require('@playwright/test')

const OUT = '/tmp/claude-0/demo/scenes'
const BASE = 'http://127.0.0.1:5199'
const SLOW = 2 // se graba a media velocidad y el video final se acelera x2 (movimiento más fluido)
const W = 1280, H = 720, DPR = 1.5 // 1280x720 CSS a 1,5x = cuadros de 1920x1080 nítidos y sin costuras en el mapa
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', env: { ...process.env, LANGUAGE: 'es_CL:es', LANG: 'es_CL.UTF-8', LC_ALL: 'es_CL.UTF-8' }, args: [`--force-device-scale-factor=${DPR}`, '--hide-scrollbars', '--lang=es-CL'] })
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'es-CL', timezoneId: 'America/Santiago' })
const st = { rec: false, scene: null, n: 0, meta: {}, caption: null, mouse: { x: W / 2, y: H / 2 } }
await ctx.exposeBinding('__demoState', () => ({ caption: st.caption, mouse: st.mouse }))
await ctx.addInitScript(() => {
  const setup = async () => {
    if (window.top !== window || document.getElementById('demo-cursor')) return
    const style = document.createElement('style')
    style.textContent = `
            #demo-cursor{position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
      .demo-ripple{position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(227,28,95,.35);border:2px solid rgba(227,28,95,.9);z-index:2147483646;pointer-events:none;animation:demo-rip .5s ease-out forwards}
      @keyframes demo-rip{to{transform:scale(3.4);opacity:0}}
      #demo-caption{position:fixed;left:36px;bottom:36px;z-index:2147483645;pointer-events:none;display:flex;align-items:center;gap:16px;padding:14px 22px 14px 14px;border-radius:18px;background:rgba(20,20,24,.86);color:#fff;font-family:Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.28);backdrop-filter:blur(6px);opacity:0;transition:opacity .35s}
      #demo-caption.on{opacity:1}
      #demo-caption b{display:grid;place-items:center;min-width:46px;height:46px;border-radius:12px;background:linear-gradient(90deg,#ff385c,#d70466);font-size:19px;font-weight:700;letter-spacing:.5px}
      #demo-caption div{display:grid;gap:2px}#demo-caption strong{font-size:21px;font-weight:650;line-height:1.2}#demo-caption span{font-size:15px;color:rgba(255,255,255,.78);line-height:1.3}`
    document.documentElement.appendChild(style)
    const cur = document.createElement('div'); cur.id = 'demo-cursor'
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2.5v17.2l4.6-4.3 3 6.6 2.9-1.3-3-6.5h6.3z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    document.documentElement.appendChild(cur)
    const cap = document.createElement('div'); cap.id = 'demo-caption'; cap.innerHTML = '<b></b><div><strong></strong><span></span></div>'
    document.documentElement.appendChild(cap)
    const place = (x, y) => { cur.style.transform = `translate(${x - 4}px,${y - 2}px)` }
    window.__setCaption = (c) => { if (!c) { cap.classList.remove('on'); return } cap.querySelector('b').textContent = c.n; cap.querySelector('strong').textContent = c.title; cap.querySelector('span').textContent = c.sub; cap.classList.add('on') }
    document.addEventListener('mousemove', (e) => place(e.clientX, e.clientY), true)
    document.addEventListener('mousedown', (e) => { const r = document.createElement('div'); r.className = 'demo-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 1200) }, true)
    try { const s = await window.__demoState(); place(s.mouse.x, s.mouse.y); if (s.caption) { cap.style.transition = 'none'; window.__setCaption(s.caption); requestAnimationFrame(() => { cap.style.transition = '' }) } } catch { /* sin estado */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup()
})
const page = await ctx.newPage()
await page.route('**/picsum.photos/**', async (route) => {
  const m = /\/seed\/([^/]+)\/(\d+)\/(\d+)/.exec(route.request().url())
  try { await route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8811/photo/${m[1]}/${m[2]}/${m[3]}` }) }) } catch { await route.abort() }
})
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

const cdp = await ctx.newCDPSession(page)
cdp.on('Page.screencastFrame', (f) => {
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  if (!st.rec) return
  const m = st.meta[st.scene]
  fs.writeFileSync(`${OUT}/${st.scene}/${String(m.length).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64'))
  m.push(f.metadata.timestamp)
})
async function arm() {
  await cdp.send('Page.stopScreencast').catch(() => {})
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
  await cdp.send('Animation.enable').catch(() => {})
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW }).catch(() => {})
}
const v = (ms) => page.waitForTimeout(ms * SLOW) // espera en "tiempo de video"
function scene(name) { st.scene = name; if (!st.meta[name]) { st.meta[name] = []; fs.mkdirSync(`${OUT}/${name}`, { recursive: true }) } }
async function rec(on) { if (on) { await nudge() } st.rec = on }
async function nudge() { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))) }
async function caption(n, title, sub) { st.caption = n ? { n, title, sub } : null; await page.evaluate((c) => window.__setCaption && window.__setCaption(c), st.caption) }
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
async function move(x, y, ms = 650) {
  const { x: x0, y: y0 } = st.mouse; const total = ms * SLOW; const t0 = Date.now()
  for (;;) { const k = Math.min(1, (Date.now() - t0) / total); const e = ease(k); await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e); if (k >= 1) break; await page.waitForTimeout(8) }
  st.mouse = { x, y }
}
async function center(target) {
  const loc = typeof target === 'string' ? page.locator(target).first() : target
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  const b = await loc.boundingBox(); if (!b) throw new Error('sin caja: ' + target)
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }
}
async function hover(target, ms) { const c = await center(target); await move(c.x, c.y, ms); return c }
async function click(target, ms) { await hover(target, ms); await v(180); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await v(250) }
async function type(target, text) { await click(target); await page.keyboard.type(text, { delay: 60 * SLOW }); await v(250) }
async function scroll(px, ms = 2500) {
  const total = ms * SLOW; const t0 = Date.now(); let done = 0
  for (;;) { const k = Math.min(1, (Date.now() - t0) / total); const goal = Math.round(px * ease(k)); if (goal !== done) { await page.evaluate((dy) => window.scrollBy(0, dy), goal - done); done = goal } if (k >= 1) break; await page.waitForTimeout(8) }
}
async function reveal(loc) { // desplaza la página con suavidad hasta que el elemento quede a la vista
  for (let i = 0; i < 14; i++) {
    const r = await loc.evaluate((el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: window.innerHeight } })
    if (r.bottom < r.h - 28 && r.top > 84) return
    const before = await page.evaluate(() => window.scrollY)
    await scroll(r.top <= 84 ? -220 : Math.max(120, Math.min(300, r.bottom - r.h + 90)), 650)
    if ((await page.evaluate(() => window.scrollY)) === before) return
  }
}
const pageRoom = () => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
async function settle(ms = 600) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(ms) }
async function shot(name) { await page.screenshot({ path: `/tmp/claude-0/demo/frames/${name}.jpg`, type: 'jpeg', quality: 85 }) }
const day = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
const step = async (name, fn) => { const t = Date.now(); try { await fn() } catch (e) { console.log('ERROR en', name, '::', e.message.split('\n')[0]); await shot('error-' + name); throw e } console.log('ok', name, ((Date.now() - t) / 1000).toFixed(1) + 's'); fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify(st.meta)) }

// ------------------------------------------------------------------ tarjetas de inicio y cierre (imágenes fijas)
const card = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html{zoom:.6666667}html,body{margin:0;width:1920px;height:1080px;font-family:Inter,system-ui,sans-serif;color:#fff;overflow:hidden}
body{background:radial-gradient(1200px 700px at 78% 18%,rgba(255,56,92,.38),transparent 60%),radial-gradient(900px 600px at 12% 88%,rgba(215,4,102,.30),transparent 60%),#15131a;display:grid;place-items:center}
.logo{width:132px;height:132px;border-radius:34px;background:linear-gradient(135deg,#ff385c,#d70466);display:grid;place-items:center;font-size:84px;font-weight:800;box-shadow:0 24px 60px rgba(227,28,95,.45)}
h1{font-size:104px;margin:38px 0 0;font-weight:800;letter-spacing:-3px}p{font-size:34px;margin:22px 0 0;color:rgba(255,255,255,.82);max-width:1300px;line-height:1.35}
.tag{display:inline-block;margin-top:46px;padding:14px 28px;border:1.5px solid rgba(255,255,255,.3);border-radius:999px;font-size:24px;color:rgba(255,255,255,.9);letter-spacing:.4px}
.wrap{text-align:center;display:grid;justify-items:center}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:56px;width:1560px}
.col{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:26px;padding:34px;text-align:left}
.col h3{margin:0 0 16px;font-size:22px;letter-spacing:1.6px;text-transform:uppercase;color:#ff7a95}.col li{font-size:27px;line-height:1.55;color:rgba(255,255,255,.9)}.col ul{margin:0;padding-left:26px}
.small{font-size:25px;margin-top:44px;color:rgba(255,255,255,.7)}</style></head><body><div class="wrap">${inner}</div></body></html>`
const cards = await ctx.newPage()
await cards.setContent(card(`<div class="logo">W</div><h1>W Experiencias</h1><p>Plataforma de reservas de turismo regenerativo y de bienestar en la Región del Maule</p><span class="tag">Demostración del sistema · Proyecto de título</span>`))
await cards.screenshot({ path: '/tmp/claude-0/demo/frames/card-intro.png' })
await cards.setContent(card(`<div class="logo" style="width:96px;height:96px;font-size:60px;border-radius:26px">W</div><h1 style="font-size:76px;margin-top:26px">W Experiencias</h1>
<div class="cols"><div class="col"><h3>Para el huésped</h3><ul><li>Búsqueda por destino, fechas y mapa</li><li>Reserva con calendario</li><li>Pago con tarjeta o transferencia</li><li>Reseñas verificadas</li></ul></div>
<div class="col"><h3>Para el anfitrión</h3><ul><li>Publicación de ofertas</li><li>Gestión de reservas y pagos</li><li>Reportes y descarga CSV</li><li>Comisión y neto por reserva</li></ul></div>
<div class="col"><h3>Tecnología</h3><ul><li>React · Vite · Leaflet</li><li>Django REST · PostgreSQL</li><li>121 pruebas automatizadas</li><li>GitHub Actions · Docker · AWS</li></ul></div></div>
<div class="small">github.com/recabaledison45-ops/Proyecto-de-titulo</div>`))
await cards.screenshot({ path: '/tmp/claude-0/demo/frames/card-outro.png' })
await cards.close()

// ------------------------------------------------------------------ 01 portada
await step('01-portada', async () => {
  await page.goto(BASE + '/'); await page.getByText('Mejor valoradas').waitFor(); await settle(1500); await arm()
  scene('s01'); await caption('01', 'Portada', 'Buscador, categorías y experiencias destacadas del Maule')
  await page.mouse.move(st.mouse.x, st.mouse.y); await rec(true)
  await v(1800); await move(840, 300, 900); await v(500)
  const room = await pageRoom()
  await scroll(Math.round(room * 0.3), 3200); await v(1000); await shot('k01-home-a'); await scroll(Math.round(room * 0.3), 3200); await v(1000); await shot('k01-home-b'); await scroll(room - 2 * Math.round(room * 0.3), 3200); await v(1000); await shot('k01-home-c')
  await scroll(-room, 2400); await v(700); await rec(false)
})

// ------------------------------------------------------------------ 02 ingreso
await step('02-ingreso', async () => {
  scene('s02'); await caption('02', 'Ingreso', 'Cuentas de huésped y anfitrión con sesión segura'); await rec(true)
  await click(page.getByRole('button', { name: 'Menú de cuenta' })); await v(500)
  const item = page.getByRole('menuitem', { name: /Ingresar/ })
  if (await item.count()) await click(item); else { await page.keyboard.press('Escape'); await page.goto(BASE + '/login') }
  await page.locator('form').waitFor(); await settle(500); await arm(); await v(600)
  await type('input[autocomplete=username]', 'huesped'); await type('input[autocomplete=current-password]', 'demo1234'); await shot('k02-login')
  await click('button[type=submit]'); await page.waitForFunction(() => location.pathname !== '/login'); await settle(900); await arm(); await v(900); await rec(false)
})

// ------------------------------------------------------------------ 03 búsqueda
await step('03-busqueda', async () => {
  if (new URL(page.url()).pathname !== '/') { await page.goto(BASE + '/'); await page.getByText('Mejor valoradas').waitFor(); await settle(900); await arm() }
  scene('s03'); await caption('03', 'Búsqueda', 'Destino, fechas y número de personas'); await rec(true); await v(600)
  await type('#s-where', 'Constitución'); await v(300)
  await click('#s-in'); await page.locator('#s-in').fill(day(35)); await v(500)
  await click('#s-out'); await page.locator('#s-out').fill(day(37)); await v(500)
  const guests = page.locator('#s-guests'); if (await guests.count()) { await click(guests); await guests.fill('2'); await v(400) }
  await shot('k03-search'); await click(page.getByRole('button', { name: 'Buscar' }))
  await page.waitForURL(/\/explore/); await page.locator('section[aria-label=Resultados] article').first().waitFor(); await settle(1200); await arm(); await v(2200); await shot('k03-results'); await rec(false)
})

// ------------------------------------------------------------------ 04 mapa
await step('04-mapa', async () => {
  await page.goto(BASE + '/explore'); await page.locator('section[aria-label=Resultados] article').first().waitFor(); await settle(1500); await arm()
  scene('s04'); await caption('04', 'Mapa interactivo', 'Los resultados se actualizan al mover y acercar el mapa'); await rec(true); await v(1200)
  const cardsList = page.locator('section[aria-label=Resultados] article')
  for (let i = 0; i < Math.min(3, await cardsList.count()); i++) { await hover(cardsList.nth(i), 700); await v(650) }
  const map = await center('.leaflet-container')
  const pinOf = (t) => page.locator('.price-pin', { hasText: t }).first()
  let pin = pinOf('$89k'); if (!(await pin.count())) pin = page.locator('.price-pin').first()
  await hover(pin, 900); await v(500)
  for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, -240); await v(1500) }
  await v(500); await shot('k04-zoom-in')
  // arrastrar el mapa
  const p0 = { ...st.mouse }
  await move(p0.x + 90, p0.y + 90, 500); await page.mouse.down(); await move(p0.x + 10, p0.y + 20, 1100); await page.mouse.up(); await v(1300)
  pin = pinOf('$65k'); if (!(await pin.count())) pin = page.locator('.price-pin').first()
  if (await pin.count()) { await click(pin, 800); await v(2200); await shot('k04-popup'); const close = page.locator('.leaflet-popup-close-button'); if (await close.count()) await click(close.first(), 500); else await page.keyboard.press('Escape') }
  await move(map.x, map.y + 120, 600)
  for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 240); await v(1400) }
  await v(600); await shot('k04-zoom-out')
  for (const name of ['Actividades', 'Alojamientos', 'Todo']) { const tab = page.getByRole('tab', { name }); if (await tab.count()) { await click(tab.first(), 800); await v(1500) } }
  await shot('k04-chips'); await rec(false)
})

// ------------------------------------------------------------------ 05 ficha
await step('05-ficha', async () => {
  await page.goto(BASE + '/explore?q=Caba%C3%B1a'); const first = page.locator('section[aria-label=Resultados] article a').first(); await first.waitFor(); await settle(1200); await arm()
  scene('s05'); await caption('05', 'Ficha de la experiencia', 'Fotos, descripción, ubicación y reseñas de otros huéspedes'); await rec(true); await v(700)
  await click(first, 900); await page.locator('#reservar').waitFor(); await settle(1300); await arm(); await v(1500); await shot('k05-detail-top')
  const fav = page.getByRole('button', { name: 'Guardar en favoritos' }); if (await fav.count()) { await click(fav.first(), 800); await v(800) }
  await move(460, 420, 700); const room = await pageRoom()
  await scroll(Math.round(room * 0.45), 3600); await v(1200); await shot('k05-detail-mid'); await scroll(room - Math.round(room * 0.45), 3600); await v(1400); await shot('k05-detail-low')
  await scroll(-room, 2400); await v(600); await rec(false)
})

// ------------------------------------------------------------------ 06 reserva
let bookingId
await step('06-reserva', async () => {
  scene('s06'); await caption('06', 'Reserva', 'Calendario con disponibilidad real y total calculado al instante'); await rec(true); await v(600)
  await hover('#reservar', 800); await v(400)
  await click(page.locator('#reservar button.rdp-button_next, #reservar button[aria-label*="iguiente"]').first()); await v(500)
  const days = page.locator('#reservar td[data-day] button:not([disabled])')
  await click(days.nth(9), 700); await v(350); await click(days.nth(11), 700); await v(600)
  const more = page.getByRole('button', { name: 'Más personas' }); if (await more.count()) { await click(more.first(), 700); await v(500) }
  await shot('k06-widget'); await v(900)
  const reserve = page.locator('#reservar').getByRole('button', { name: 'Reservar' })
  await reveal(reserve); await v(500); await click(reserve, 800)
  await page.waitForURL(/\/bookings$/); await page.getByText(/Reserva #/).first().waitFor(); await settle(1000); await arm(); await v(2000)
  const ids = await page.locator('[data-booking-id]').evaluateAll((els) => els.map((e) => Number(e.dataset.bookingId)))
  bookingId = Math.max(...ids); await shot('k06-bookings'); await rec(false)
})

// ------------------------------------------------------------------ 07 pago con tarjeta
await step('07-pago', async () => {
  scene('s07'); await caption('07', 'Pago con tarjeta', 'Webpay Plus en ambiente de pruebas: la reserva se confirma al instante'); await rec(true); await v(500)
  const item = page.locator(`[data-booking-id="${bookingId}"]`)
  await click(item.getByRole('button', { name: 'Pagar' }), 900); await page.getByRole('note').waitFor(); await v(2600); await shot('k07-dialog')
  await click(page.getByRole('button', { name: /con tarjeta/ }), 900)
  await page.waitForURL(/8799/); await page.locator('#card').waitFor(); await settle(500); await arm(); await v(1300)
  await type('#card', '4051 8856 0044 6623'); await type('#exp', '12/28'); await type('#cvv', '123'); await shot('k07-gateway'); await v(500)
  await click('#approve', 800)
  await page.waitForURL(/payments\/result/); await page.getByRole('heading', { level: 1 }).waitFor(); await settle(1000); await arm(); await v(1200)
  await move(640, 380, 800); await v(3200); await shot('k07-receipt')
  await click(page.getByRole('link', { name: 'Ver mis reservas' }), 900); await page.getByText(/Reserva #/).first().waitFor(); await settle(900); await arm()
  await hover(page.locator(`[data-booking-id="${bookingId}"]`), 800); await v(2600); await shot('k07-confirmed'); await rec(false)
})

// ------------------------------------------------------------------ 08 anfitrión
await step('08-anfitrion', async () => {
  await caption(null)
  await page.evaluate(async () => {
    const r = await fetch('/api/v1/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'anfitrion', password: 'demo1234' }) })
    const d = await r.json(); localStorage.setItem('access', d.access); localStorage.setItem('refresh', d.refresh)
  })
  await page.goto(BASE + '/account'); await page.getByText('Reservas recibidas').first().waitFor(); await settle(1500); await arm()
  scene('s08'); await caption('08', 'Panel del anfitrión', 'Reservas recibidas, ofertas publicadas, nuevas publicaciones y reportes'); await rec(true); await v(1800); await shot('k08-host')
  await move(600, 400, 800); let room = await pageRoom(); await scroll(Math.min(room, 520), 2400); await v(1300); await scroll(-Math.min(room, 520), 1400); await v(400)
  // Mis ofertas
  await click(page.getByRole('tab', { name: 'Mis ofertas' }).first(), 900); await settle(600); await v(2200); await shot('k08-ofertas')
  // Publicar oferta
  await click(page.getByRole('tab', { name: 'Publicar oferta' }).first(), 900); await settle(600); await v(900)
  const title = page.getByLabel('Título'); if (await title.count()) { await type(title.first(), 'Cabalgata al atardecer en Colbún') }
  await shot('k08-publicar'); await move(120, 420, 600)
  const pick = page.locator('form .leaflet-container').first()
  if (await pick.count()) {
    const y0 = await page.evaluate(() => window.scrollY); await pick.evaluate((el) => el.scrollIntoView({ block: 'center' })); const y1 = await page.evaluate(() => window.scrollY)
    await page.evaluate((y) => window.scrollTo(0, y), y0); await scroll(y1 - y0, 2600); await v(700)
    const b = await pick.boundingBox(); await move(b.x + b.width * 0.62, b.y + b.height * 0.52, 800); await v(300); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await v(1800); await shot('k08-mapa-oferta')
    await move(120, 420, 500); await scroll(-(y1 - y0), 1500); await v(300)
  }
  // Reportes
  await click(page.getByRole('tab', { name: 'Reportes' }).first(), 900); await settle(600); await v(2000); await shot('k08-reportes')
  await move(620, 420, 600); room = await pageRoom(); await scroll(Math.min(room, 420), 2200); await v(1800); await shot('k08-reportes-b')
  await v(600); await rec(false)
})

fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify(st.meta))
for (const [k, ts] of Object.entries(st.meta)) console.log(k, ts.length, 'cuadros', ((ts.at(-1) - ts[0]) / SLOW).toFixed(1) + 's de video', (ts.length / (ts.at(-1) - ts[0])).toFixed(1) + ' fps reales')
await browser.close()
