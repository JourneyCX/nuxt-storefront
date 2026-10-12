import { tradeCartOn, cartCall, skuForAdd } from '~/server/utils/tradeCart'
import { requireTradeEnabled, requireSameOrigin } from '~/server/utils/tradeApi'
import { getRawBody } from '~/server/utils/http-compat'

// POST /api/trade/cart {action, ...} -- every change to the trade cart and the order itself. Stratum answers with the
// cart as it is afterwards, or with a refusal in plain words (its status code and JSON are passed straight through:
// 422 a rule refused it, 409 a price changed / stock ran short / the cart changed elsewhere, 403 account on hold).
// The browser may name a product, a line, a quantity, one of the company's locations, a PO number and the checkout token;
// it never sends a price, a total, a company or a buyer.
const ACTIONS: Record<string, string> = {
  add:      'cart_add',
  update:   'cart_update',
  remove:   'cart_remove',
  clear:    'cart_clear',
  location: 'cart_set_location',
  details:  'cart_set_details',
  prepare:  'cart_prepare',
  place:    'order_place',
}

export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  requireSameOrigin(event)
  if (!tradeCartOn(event)) throw createError({ statusCode: 409, statusMessage: 'Trade ordering is not open yet.' })
  const body = (await getRawBody<Record<string, any>>(event)) ?? {}
  const path = ACTIONS[String(body.action ?? '')]
  if (!path) throw createError({ statusCode: 400, statusMessage: 'Unknown cart action.' })

  const send: Record<string, unknown> = {}
  switch (body.action) {
    case 'add':      Object.assign(send, { wc_product_id: Number(body.productId ?? 0), qty: Number(body.qty ?? 1), variation: Array.isArray(body.variation) ? body.variation : undefined, sku: await skuForAdd(event, Number(body.productId ?? 0), body.sku) }); break
    case 'update':   Object.assign(send, { line_id: Number(body.lineId ?? 0), qty: Number(body.qty ?? 0) }); break
    case 'remove':   Object.assign(send, { line_id: Number(body.lineId ?? 0) }); break
    case 'location': Object.assign(send, { location_id: Number(body.locationId ?? 0) }); break
    case 'details':  Object.assign(send, { po_number: typeof body.po === 'string' ? body.po.slice(0, 60) : undefined, note: typeof body.note === 'string' ? body.note.slice(0, 600) : undefined }); break
    case 'place':    Object.assign(send, { token: String(body.token ?? ''), revision: String(body.revision ?? '') }); break
  }
  const r = await cartCall(event, path, send)
  event.node.res.statusCode = r.status
  return r.data ?? { success: false, error: 'No answer from the server.' }
})
