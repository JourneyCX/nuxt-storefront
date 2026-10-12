import { tradeCartOn, cartCall } from '~/server/utils/tradeCart'
import { requireTradeEnabled } from '~/server/utils/tradeApi'

// GET /api/trade/order/B2B-12 -- one of the signed-in company's own orders (Stratum checks the company, not this route).
export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  if (!tradeCartOn(event)) throw createError({ statusCode: 409, statusMessage: 'Trade ordering is not open yet.' })
  const ref = String(getRouterParam(event, 'ref') ?? '')
  if (!/^B2B-\d{1,10}$/.test(ref)) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
  const r = await cartCall(event, 'order_get', { order_number: ref })
  if (r.status !== 200 || !r.data?.success) throw createError({ statusCode: r.status === 404 ? 404 : 502, statusMessage: String(r.data?.error || 'Order not found.') })

  return r.data.order
})
