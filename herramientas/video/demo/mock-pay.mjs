// Pasarela simulada para la grabación (misma API REST que Webpay Plus v1.2). No imita la marca de Transbank.
import { createServer } from 'node:http'
const PORT = 8799
const API = '/rswebpaytransaction/api/webpay/v1.2/transactions'
const tx = new Map(); let n = 0
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => { d += c }); req.on('end', () => r(d)) })
const json = (res, s, b) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)) }
const clp = (v) => '$' + Number(v).toLocaleString('es-CL')
const page = (t, token) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Pago con tarjeta · ambiente de pruebas</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#f3f4f8;color:#1f2430;min-height:100vh;display:flex;flex-direction:column}
header{background:#1f2a44;color:#fff;padding:18px 40px;display:flex;align-items:center;justify-content:space-between}
header b{font-size:20px;letter-spacing:.2px}header span{font-size:13px;background:#f6c343;color:#3b2f00;padding:6px 12px;border-radius:999px;font-weight:600}
main{flex:1;display:grid;place-items:center;padding:32px}
.box{background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(20,30,60,.12);width:880px;display:grid;grid-template-columns:1fr 1.25fr;overflow:hidden}
.sum{background:#f8f9fc;padding:36px;border-right:1px solid #e8eaf1}.sum h2{margin:0 0 20px;font-size:15px;color:#6a7187;font-weight:600;text-transform:uppercase;letter-spacing:.6px}
.row{display:flex;justify-content:space-between;padding:10px 0;font-size:15px;border-bottom:1px solid #eceef4}.row span:first-child{color:#6a7187}
.total{font-size:34px;font-weight:700;margin-top:22px}.total small{display:block;font-size:13px;color:#6a7187;font-weight:500;margin-bottom:4px}
form{padding:36px}form h1{font-size:22px;margin:0 0 6px}form p{margin:0 0 22px;color:#6a7187;font-size:14px}
label{display:block;font-size:13px;font-weight:600;margin:14px 0 6px;color:#3a4156}
input{width:100%;padding:13px 14px;border:1.5px solid #d6d9e3;border-radius:10px;font-size:16px;font-family:inherit;outline:none}input:focus{border-color:#3b63f6;box-shadow:0 0 0 3px rgba(59,99,246,.15)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.actions{display:flex;gap:12px;margin-top:26px}
a.btn{flex:1;text-align:center;padding:14px;border-radius:10px;font-weight:600;font-size:16px;text-decoration:none}
#approve{background:#3b63f6;color:#fff}#abort{background:#fff;color:#3a4156;border:1.5px solid #d6d9e3;flex:.6}#reject{display:none}
footer{text-align:center;padding:16px;font-size:12.5px;color:#6a7187}
</style></head><body>
<header><b>Pago seguro con tarjeta</b><span>Ambiente de pruebas · no se cobra dinero real</span></header>
<main><div class="box">
<div class="sum"><h2>Resumen de la compra</h2>
<div class="row"><span>Comercio</span><span>W Experiencias</span></div>
<div class="row"><span>Orden de compra</span><span>${t.buy_order}</span></div>
<div class="row"><span>Medio de pago</span><span>Crédito · sin cuotas</span></div>
<div class="total"><small>Total a pagar</small>${clp(t.amount)}</div></div>
<form onsubmit="return false"><h1>Datos de la tarjeta</h1><p>Simulación del formulario de la pasarela para la demostración.</p>
<label for="card">Número de tarjeta</label><input id="card" inputmode="numeric" placeholder="0000 0000 0000 0000" autocomplete="off">
<div class="two"><div><label for="exp">Vencimiento</label><input id="exp" placeholder="MM/AA" autocomplete="off"></div><div><label for="cvv">CVV</label><input id="cvv" placeholder="123" autocomplete="off"></div></div>
<div class="actions"><a class="btn" id="abort" href="/webpayserver/finish?token=${token}&outcome=abort">Anular</a><a class="btn" id="approve" href="/webpayserver/finish?token=${token}&outcome=approve">Pagar ${clp(t.amount)}</a><a id="reject" href="/webpayserver/finish?token=${token}&outcome=reject">r</a></div>
</form></div></main><footer>En producción este paso ocurre en el sitio de Webpay Plus (Transbank). W Experiencias no recibe ni guarda los datos de la tarjeta.</footer></body></html>`
createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`); const b = await body(req)
  if (url.pathname === '/health') return json(res, 200, { ok: true })
  if (url.pathname.startsWith(API)) {
    const [token, action] = url.pathname.slice(API.length).split('/').filter(Boolean)
    if (req.method === 'POST' && !token) { const o = JSON.parse(b); n += 1; const tk = `demo${String(n).padStart(4, '0')}`.padEnd(64, 'a'); tx.set(tk, { ...o, outcome: null }); return json(res, 200, { token: tk, url: `http://127.0.0.1:${PORT}/webpayserver/initTransaction` }) }
    const t = tx.get(token); if (!t) return json(res, 422, { error_message: 'Invalid token' })
    if (req.method === 'PUT' || req.method === 'GET') { const ok = t.outcome === 'approve'; return json(res, 200, { vci: 'TSY', amount: t.amount, status: ok ? 'AUTHORIZED' : 'FAILED', buy_order: t.buy_order, session_id: t.session_id, card_detail: { card_number: '6623' }, accounting_date: '1113', transaction_date: new Date().toISOString(), authorization_code: ok ? '1213' : '000000', payment_type_code: 'VN', response_code: ok ? 0 : -1, installments_number: 0 }) }
    if (req.method === 'POST' && action === 'refunds') return json(res, 200, { type: 'REVERSED' })
    return json(res, 405, {})
  }
  if (url.pathname === '/webpayserver/initTransaction') { const token = new URLSearchParams(b).get('token_ws') || url.searchParams.get('token_ws'); const t = tx.get(token); if (!t) { res.writeHead(400); return res.end('token') } res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(page(t, token)) }
  if (url.pathname === '/webpayserver/finish') { const token = url.searchParams.get('token'); const outcome = url.searchParams.get('outcome'); const t = tx.get(token); if (!t) { res.writeHead(400); return res.end('token') } const back = new URL(t.return_url); if (outcome === 'abort') { back.searchParams.set('TBK_TOKEN', token); back.searchParams.set('TBK_ORDEN_COMPRA', t.buy_order); back.searchParams.set('TBK_ID_SESION', t.session_id) } else { t.outcome = outcome; back.searchParams.set('token_ws', token) } res.writeHead(302, { Location: back.toString() }); return res.end() }
  res.writeHead(404); res.end('nf')
}).listen(PORT, '127.0.0.1')
