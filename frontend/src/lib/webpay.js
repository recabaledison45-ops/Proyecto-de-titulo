// Redirige al formulario de pago de Webpay Plus (Transbank) enviando el token por POST, como indica su documentación.
// La tarjeta se escribe en el sitio de Transbank: W Experiencias nunca ve ni guarda sus datos.
export function goToWebpay({ url, token }) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = url
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'token_ws'
  input.value = token
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
}

// Códigos de tipo de pago que entrega Transbank en la confirmación.
export const PAYMENT_TYPES = {
  VD: 'Débito',
  VP: 'Prepago',
  VN: 'Crédito, sin cuotas',
  VC: 'Crédito, en cuotas',
  SI: 'Crédito, 3 cuotas sin interés',
  S2: 'Crédito, 2 cuotas sin interés',
  NC: 'Crédito, cuotas sin interés',
}
