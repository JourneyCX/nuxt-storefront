import { fetchWooCredentials } from '~/server/utils/stratum'
import { stratumSignedPost } from '~/server/utils/stratumSigning'
import { decideTaxInvoiceReply, taxInvoicePageHtml, validTaxInvoiceParams } from '~/server/utils/taxInvoice'

// GET /tax-invoice/{wcOrderId}/{orderKey}
//
// The shopper's tax-invoice link (VAT-2). 1. the order key proves ownership (checked against WooCommerce with the store's admin REST
// credentials, as /api/orders/{id} does; a wrong key and an unknown order are the same 404); 2. Stratum is asked, over a signed call, for
// the PDF of the tax invoice issued for that order; 3. it is streamed under the merchant's own domain. Never cached, never indexed.
// Headers go on event.node.res (h3's setHeader is not usable on this runtime, see http-compat.ts).
function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

export default defineEventHandler(async (event) => {
  const res      = event.node.res
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const orderId  = String(getRouterParam(event, 'orderId') ?? '')
  const key      = String(getRouterParam(event, 'key') ?? '')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Robots-Tag', 'noindex')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  const notFound = () => {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return taxInvoicePageHtml('No tax invoice for this order', 'We could not find a tax invoice for this order.')
  }
  if (!validTaxInvoiceParams(orderId, key)) return notFound()

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) return notFound()
  const auth  = 'Basic ' + Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')
  const order = await $fetch<{ order_key?: string }>(`${creds.url.replace(/\/$/, '')}/wp-json/wc/v3/orders/${orderId}`, { headers: { Authorization: auth } }).catch(() => null)
  if (!order || !safeEquals(String(order.order_key ?? ''), key)) return notFound()

  const call  = await stratumSignedPost(event, '/api/storefront/tax_invoice', JSON.stringify({ wc_order_id: Number(orderId) }))
  const reply = decideTaxInvoiceReply(call.status, call.data)
  if (reply.kind === 'pdf') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${reply.filename}"`)
    return reply.bytes
  }
  res.statusCode = reply.code
  if (reply.retryAfter) res.setHeader('Retry-After', String(reply.retryAfter))
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return taxInvoicePageHtml(reply.title, reply.message)
})
