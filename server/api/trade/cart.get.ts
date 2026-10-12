import { tradeCartOn, cartCall, productImages, lineImage } from '~/server/utils/tradeCart'
import { requireTradeEnabled } from '~/server/utils/tradeApi'
import { getRawQuery } from '~/server/utils/http-compat'

// GET /api/trade/cart[?remember=1] -- the trade cart exactly as Stratum worked it out just now (prices, quantity rules,
// stock, VAT, delivery, minimum order, payment). Used by /trade/cart and /trade/checkout. The cart pages ask with
// remember=1 so a price change since the buyer last looked is reported "was / now"; the mini-cart does not.
export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  if (!tradeCartOn(event)) throw createError({ statusCode: 409, statusMessage: 'Trade ordering is not open yet.' })
  const remember = String(getRawQuery(event).remember ?? '') === '1'
  const r = await cartCall(event, 'cart_get', { remember })
  if (r.status !== 200 || !r.data?.success) {
    throw createError({ statusCode: r.status >= 400 ? r.status : 502, statusMessage: String(r.data?.error || 'Your cart could not be loaded.') })
  }
  const view = r.data
  const images = await productImages(event, (view.lines ?? []).map((l: any) => Number(l.wc_product_id ?? 0)), (view.lines ?? []).map((l: any) => String(l.sku ?? '')))
  for (const l of view.lines ?? []) l.image = lineImage(images, l)
  return view
})
