import { tradeCartOn, cartCall } from '~/server/utils/tradeCart'
import { requireSameOrigin, requireTradeEnabled } from '~/server/utils/tradeApi'
import { readTextLimited } from '~/server/utils/stratumSigning'
import { decidePopReply, parsePopBody, validOrderRef } from '~/server/utils/tradePop'

// POST /api/trade/order/B2B-12/pop -- a signed-in trade buyer uploads a proof of payment for their own EFT order (Session 6c).
// The page sends { files: [{ name, data: base64 }] }; only those two fields of each file travel on. The platform checks the company,
// the order's state, the merchant's EFT switch, the limits and the file CONTENT; this route adds the same-origin rule and a size cap.
// The upload route needs nginx `client_max_body_size 25m` (three 5 MB files as base64); that is on the verify-live list.
const MAX_BODY = 22 * 1024 * 1024

export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  requireSameOrigin(event)
  if (!tradeCartOn(event)) throw createError({ statusCode: 409, statusMessage: 'Trade ordering is not open yet.' })
  const ref = String(getRouterParam(event, 'ref') ?? '')
  if (!validOrderRef(ref)) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })

  const res = event.node.res
  res.setHeader('Cache-Control', 'private, no-store')
  const body = parsePopBody(await readTextLimited(event, MAX_BODY))
  if (!body.ok) {
    res.statusCode = 422
    return { ok: false, message: body.message }
  }
  const call = await cartCall(event, 'order_pop_upload', { order_number: ref, files: body.files })
  const reply = decidePopReply(call.status, call.data)
  res.statusCode = reply.status
  if (call.status === 429 && call.data?.retry_after) res.setHeader('Retry-After', String(call.data.retry_after))
  return { ok: reply.ok, message: reply.message, accepted: reply.accepted, proofs: reply.proofs }
})
