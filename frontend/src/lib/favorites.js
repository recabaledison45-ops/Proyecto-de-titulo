import { useSyncExternalStore } from 'react'

// Favoritos guardados en este navegador (localStorage). Sin dependencias del backend.
const KEY = 'favorites'
const listeners = new Set()
let cache = null

function read() {
  if (cache) return cache
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    cache = Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n)) : []
  } catch {
    cache = []
  }
  return cache
}

function write(next) {
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* modo privado: se mantiene en memoria */ }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, read, read)
  return {
    ids,
    has: (id) => ids.includes(Number(id)),
    toggle: (id) => {
      const n = Number(id)
      write(ids.includes(n) ? ids.filter((x) => x !== n) : [n, ...ids])
      return !ids.includes(n)
    },
  }
}
