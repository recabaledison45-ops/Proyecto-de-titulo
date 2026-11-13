import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// En desarrollo, /api y /media se envían al backend de Django (puerto 8000).
const backend = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

// Dirección de la API que usa el navegador. En Vercel siempre es relativa: vercel.json reenvía /api al backend
// (así no depende de CORS ni de variables cargadas a mano en el panel de Vercel).
const apiBase = process.env.VERCEL ? '/api/v1' : process.env.VITE_API_URL || '/api/v1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __API_BASE__: JSON.stringify(apiBase) },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/media': { target: backend, changeOrigin: true },
    },
  },
})
