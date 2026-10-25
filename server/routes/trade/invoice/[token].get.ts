import { clientIp, stratumSignedPost } from '~/server/utils/stratumSigning'
import { overLimit, type Window } from '~/server/utils/memoryGuard'
import { taxInvoicePageHtml } from '~/server/utils/taxInvoice'
import { decideInvoiceReply, validInvoiceToken } from '~/server/utils/tradeInvoice'

// GET /trade/invoice/{token}
//
// The link in a trade invoice mail (decision 3c). The token proves nothing by itself except that this mail was sent to this contact: the
// platform checks it, fetches the PDF from accounting at that moment and answers; the PDF is streamed under the merchant's own domain.
// Never cached, never indexed. Headers go on event.node.res (h3's setHeader is not usable on this runtime, see http-compat.ts).
// Abuse guard: 30 requests per address per 10 minutes before anything is asked upstream (the platform rate-limits as well).
const hits = new Map<string, Window>()

export default defineEventHandler(async (event) => {
  const res = event.node.res
  const tenantId = event.context.tenantId as number
  const token = String(getRouterParam(event, 'token') ?? '')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Robots-Tag', 'noindex')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')

  const page = (code: number, title: string, message: string, retryAfter?: number) => {
    res.statusCode = code
    if (retryAfter) res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return taxInvoicePageHtml(title, message)
  }

  if (!validInvoiceToken(token)) return page(404, 'This link is not valid any more', 'We could not find that invoice. The link may have expired; please contact us for a new copy.')
  if (overLimit(hits, `${tenantId}|${clientIp(event)}`, Date.now(), 30, 10 * 60 * 1000)) {
    return page(429, 'Please try again shortly', 'Too many requests. Please try again in a few minutes.', 600)
  }

  const call = await stratumSignedPost(event, 'invoice_get', JSON.stringify({ token }))
  const reply = decideInvoiceReply(call.status, call.data)
  if (reply.kind === 'pdf') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${reply.filename}"`)
    return reply.bytes
  }
  return page(reply.code, reply.title, reply.message, reply.retryAfter)
})
