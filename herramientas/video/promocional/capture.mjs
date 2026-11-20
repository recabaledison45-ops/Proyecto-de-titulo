import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('/home/claude/proyecto-de-titulo/e2e/')
const { chromium } = require('@playwright/test')
const DIR = '/tmp/claude-0/promo'
const vo = JSON.parse(fs.readFileSync(`${DIR}/vo/durations.json`))
const pad = { s1: 1.45, s2: 1.4, s3: 3.2, s4: 3.6, s5: 3.6, s6: 2.9, s7: 2.8 }
const tl = {}; let start = 0
for (const k of Object.keys(pad)) { const dur = +(vo[k] + pad[k]).toFixed(2); tl[k] = { start: +start.toFixed(2), dur, tail: 0.7 }; start += dur }
const total = start
const frames = Object.fromEntries(fs.readdirSync(`${DIR}/clips`).map((n) => [n, fs.readdirSync(`${DIR}/clips/${n}`).length]))
fs.writeFileSync(`${DIR}/timeline.json`, JSON.stringify({ tl, total }, null, 1))
const only = process.argv[2] === 'transitions' ? null : (process.argv[2] ? process.argv[2].split(',').map(Number) : null)
const fixTransitions = process.argv[2] === 'transitions'
const out = only ? `${DIR}/test` : `${DIR}/frames`
if (!fixTransitions) { fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true }) }
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
await page.goto(`file://${DIR}/promo.html`)
await page.evaluate(() => document.fonts.ready)
await page.evaluate(([a, b]) => window.setup(a, b), [tl, frames])
let idx = Array.from({ length: Math.round(total * 30) }, (_, i) => i)
if (fixTransitions) idx = idx.filter((i) => Object.values(tl).some((s) => s.start > 0 && i / 30 >= s.start && i / 30 < s.start + 0.7))
const times = only ?? idx.map((i) => i / 30)
let n = 0
for (const t of times) {
  await page.evaluate((t) => window.render(t), t)
  await page.evaluate(() => Promise.all([...document.querySelectorAll('img[data-live]')].filter((i) => i.offsetParent && i.getAttribute('src')).map((i) => i.decode().catch(() => {}))))
  await page.screenshot({ path: only ? `${out}/t_${t}.jpg` : `${out}/${String(Math.round(t * 30)).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 })
  n++
  if (!only && n % 150 === 0) console.log('frames', n, '/', times.length)
}
await browser.close()
console.log('total', total.toFixed(2), 's', JSON.stringify(tl))
