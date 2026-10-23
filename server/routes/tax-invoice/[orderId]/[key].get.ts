import { fetchWooCredentials } from '~/server/utils/stratum'
import { clientIp, stratumSignedPost } from '~/server/utils/stratumSigning'
import { cacheGet, cacheSet, overLimit, type Entry, type Window } from '~/server/utils/memoryGuard'
import { decideTaxInvoiceReply, taxInvoicePageHtml, validTaxInvoiceParams } from '~/server/utils/taxInvoice'

// GET /tax-invoice/{wcOrderId}/{orderKey}
//
// The shopper's tax-invoice link (VAT-2). 1. the order key proves ownership (checked against WooCommerce with the store's admin REST
// credentials, as /api/orders/{id} does; a wrong key and an unknown order are the same 404); 2. Stratum is asked, over a signed call, for
// the PDF of the tax invoice issued for that order; 3. it is streamed under the merchant's own domain. Never cached, never indexed.
// Headers go on event.node.res (h3's setHeader is not usable on this runtime, see http-compat.ts).
// Abuse guard (a guessable order id is enough to reach the two upstream calls): 20 requests per address per 10 minutes, and the store
// credentials are remembered for 60 s so a burst does not ask Stratum for them every time. A failed lookup is not remembered.
const hits = new Map<string, Window>()
const credsCache = new Map<string, Entry<NonNullable<Awaited<ReturnType<typeof fetchWooCredentials>>>>>()
const WOO_TIMEOUT_MS = 8000

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
  if (overLimit(hits, `${tenantId}|${clientIp(event)}`, Date.now(), 20, 10 * 60 * 1000)) {
    res.statusCode = 429
    res.setHeader('Retry-After', '600')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return taxInvoicePageHtml('Please try again later', 'Too many requests. Please try again in a few minutes.')
  }

  let creds = cacheGet(credsCache, String(tenantId), Date.now())
  if (!creds) {
    creds = (await fetchWooCredentials(config.stratumInternalUrl, tenantId)) ?? undefined
    if (!creds) return notFound()
    cacheSet(credsCache, String(tenantId), creds, Date.now(), 60_000)
  }
  const auth  = 'Basic ' + Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')
  const order = await $fetch<{ order_key?: string }>(`${creds.url.replace(/\/$/, '')}/wp-json/wc/v3/orders/${orderId}`, { headers: { Authorization: auth }, timeout: WOO_TIMEOUT_MS }).catch(() => null)
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
