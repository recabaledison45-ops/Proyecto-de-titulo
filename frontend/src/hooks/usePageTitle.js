import { useEffect } from 'react'

const DEFAULT_TITLE = 'W Experiencias · Turismo regenerativo y de bienestar en el Maule'
const DEFAULT_DESCRIPTION =
  'Reserva experiencias, paquetes, guías y alojamientos de turismo regenerativo y de bienestar en la Región del Maule, con emprendimientos locales.'

function setMeta(selector, create, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', value)
}

/**
 * Título, descripción, canonical y robots por página (SEO básico de una SPA).
 * `noindex` se usa en páginas privadas (cuenta, reservas, favoritos, login).
 */
export function usePageTitle(title, { description, noindex = false } = {}) {
  useEffect(() => {
    document.title = title ? `${title} · W Experiencias` : DEFAULT_TITLE
    const text = (description || DEFAULT_DESCRIPTION).slice(0, 300)
    setMeta('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), text)
    setMeta('meta[property="og:title"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m }, document.title)
    setMeta('meta[property="og:description"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m }, text)
    setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), `${window.location.origin}${window.location.pathname}`)
    setMeta('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), noindex ? 'noindex, nofollow' : 'index, follow')
  }, [title, description, noindex])
}
