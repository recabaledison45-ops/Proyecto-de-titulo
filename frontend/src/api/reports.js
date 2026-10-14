import { api } from './client'

const range = (from, to) => ({ from: from || undefined, to: to || undefined })

export const summary = (from, to) => api.get('/reports/summary/', { params: range(from, to) }).then((r) => r.data)

// El CSV requiere el token: se descarga como blob y se guarda desde el navegador.
export async function downloadCsv(kind, from, to) {
  const { data } = await api.get(`/reports/${kind}.csv`, { params: range(from, to), responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${kind}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
