// Webpay Plus simulado para las pruebas E2E (misma API REST v1.2 que Transbank, sin internet ni dinero).
// El backend apunta aquí con WEBPAY_BASE_URL. NO es parte de la aplicación: solo lo usan las pruebas.
import { createServer } from 'node:http'

const PORT = Number(process.env.MOCK_WEBPAY_PORT || 8799)
const API = '/rswebpaytransaction/api/webpay/v1.2/transactions'
const transactions = new Map()
let counter = 0

const readBody = (req) => new Promise((resolve) => {
  let data = ''
  req.on('data', (chunk) => { data += chunk })
  req.on('end', () => resolve(data))
})
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) }

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const body = await readBody(req)

  if (url.pathname === '/health') return json(res, 200, { ok: true })

  if (url.pathname.startsWith(API)) {
    if (!req.headers['tbk-api-key-id'] || !req.headers['tbk-api-key-secret']) return json(res, 401, { error_message: 'Not Authorized' })
    const [token, action] = url.pathname.slice(API.length).split('/').filter(Boolean)

    if (req.method === 'POST' && !token) {
      const order = JSON.parse(body)
      const valid = order.buy_order && order.buy_order.length <= 26 && order.session_id && Number.isInteger(order.amount) && order.amount > 0 && /^https?:\/\//.test(order.return_url)
      if (!valid) return json(res, 422, { error_message: 'Invalid value for parameter' })
      counter += 1
      const newToken = `mock${String(counter).padStart(4, '0')}`.padEnd(64, 'a')
      transactions.set(newToken, { ...order, outcome: null, committed: false, refunded: false })
      return json(res, 200, { token: newToken, url: `http://127.0.0.1:${PORT}/webpayserver/initTransaction` })
    }

    const tx = transactions.get(token)
    if (!tx) return json(res, 422, { error_message: 'Invalid token' })

    if (req.method === 'PUT' && !action) {
      if (!tx.outcome) return json(res, 422, { error_message: 'Transaction not paid' })
      tx.committed = true
      const ok = tx.outcome === 'approve'
      return json(res, 200, {
        vci: ok ? 'TSY' : 'TSN', amount: tx.amount, status: ok ? 'AUTHORIZED' : 'FAILED', buy_order: tx.buy_order,
        session_id: tx.session_id, card_detail: { card_number: '6623' }, accounting_date: '1112',
        transaction_date: new Date().toISOString(), authorization_code: ok ? '1213' : '000000',
        payment_type_code: 'VN', response_code: ok ? 0 : -1, installments_number: 0,
      })
    }
    if (req.method === 'POST' && action === 'refunds') {
      tx.refunded = true
      return json(res, 200, { type: 'REVERSED' })
    }
    return json(res, 405, { error_message: 'Method not allowed' })
  }

  // Formulario de pago (lo que ve el huésped en Transbank)
  if (url.pathname === '/webpayserver/initTransaction') {
    const token = new URLSearchParams(body).get('token_ws') || url.searchParams.get('token_ws')
    const tx = transactions.get(token)
    if (!tx) { res.writeHead(400); return res.end('token invalido') }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(`<!doctype html><html lang="es"><title>Webpay simulado</title><body style="font-family:sans-serif;max-width:480px;margin:40px auto">
      <h1>Webpay (simulado para pruebas)</h1><p>Monto: <strong id="amount">${tx.amount}</strong> · Orden: ${tx.buy_order}</p>
      <p><a id="approve" href="/webpayserver/finish?token=${token}&outcome=approve">Pagar</a></p>
      <p><a id="reject" href="/webpayserver/finish?token=${token}&outcome=reject">Tarjeta rechazada</a></p>
      <p><a id="abort" href="/webpayserver/finish?token=${token}&outcome=abort">Anular compra</a></p></body></html>`)
  }

  if (url.pathname === '/webpayserver/finish') {
    const token = url.searchParams.get('token')
    const outcome = url.searchParams.get('outcome')
    const tx = transactions.get(token)
    if (!tx) { res.writeHead(400); return res.end('token invalido') }
    const back = new URL(tx.return_url)
    if (outcome === 'abort') {
      back.searchParams.set('TBK_TOKEN', token)
      back.searchParams.set('TBK_ORDEN_COMPRA', tx.buy_order)
      back.searchParams.set('TBK_ID_SESION', tx.session_id)
    } else {
      tx.outcome = outcome
      back.searchParams.set('token_ws', token)
    }
    res.writeHead(302, { Location: back.toString() })
    return res.end()
  }

  res.writeHead(404)
  res.end('not found')
}).listen(PORT, '127.0.0.1', () => console.log(`Webpay simulado en http://127.0.0.1:${PORT}`))
