import { tradeCartOn, cartCall } from '~/server/utils/tradeCart'
import { requireTradeEnabled } from '~/server/utils/tradeApi'
import { validOrderRef } from '~/server/utils/tradePop'

// GET /api/trade/order/B2B-12/pop -- what the buyer has uploaded for their own order and what became of it (Session 6c).
// Name, time, state and a decline reason only; the platform never gives a path, a stored name or a hash.
export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  if (!tradeCartOn(event)) throw createError({ statusCode: 409, statusMessage: 'Trade ordering is not open yet.' })
  const ref = String(getRouterParam(event, 'ref') ?? '')
  if (!validOrderRef(ref)) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
  event.node.res.setHeader('Cache-Control', 'private, no-store')
  const r = await cartCall(event, 'order_pop_status', { order_number: ref })
  if (r.status !== 200 || !r.data?.success) throw createError({ statusCode: r.status === 404 ? 404 : 502, statusMessage: String(r.data?.error || 'Order not found.') })

  return { eft: Boolean(r.data.eft), proofs: Array.isArray(r.data.proofs) ? r.data.proofs : [] }
})
