// Genera robots.txt y sitemap.xml en dist/ con el dominio real (variable SITE_URL).
// Se ejecuta después de `vite build` (ver "build" en package.json).
import { mkdirSync, writeFileSync } from 'node:fs'

const site = (process.env.SITE_URL || 'https://wexperiencias.example.cl').replace(/\/+$/, '')
if (process.env.CI_STRICT_SITE_URL === 'true' && site.includes('example.cl')) {
  console.error('SITE_URL no está definido: robots.txt y sitemap.xml apuntarían a example.cl')
  process.exit(1)
}

const pages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/explore', priority: '0.9', changefreq: 'daily' },
  { path: '/login', priority: '0.3' },
  { path: '/register', priority: '0.3' },
]

mkdirSync('dist', { recursive: true })
writeFileSync(
  'dist/robots.txt',
  `User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /bookings\nDisallow: /favorites\n\nSitemap: ${site}/sitemap.xml\n`,
)
const urls = pages
  .map((p) => `  <url><loc>${site}${p.path}</loc>${p.changefreq ? `<changefreq>${p.changefreq}</changefreq>` : ''}<priority>${p.priority}</priority></url>`)
  .join('\n')
writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
console.log(`SEO: robots.txt y sitemap.xml generados para ${site}`)
