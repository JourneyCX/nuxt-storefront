import { createWcStoreClient, createWcClient } from '~/server/utils/woocommerce'
import { tradeCartOn, cartOrThrow, toWcCart, skuForAdd } from '~/server/utils/tradeCart'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import { getRawCookie, setRawCookie, getRawBody } from '~/server/utils/http-compat'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const body     = await getRawBody<{ productId: number; quantity?: number; variation?: unknown }>(event)

  if (!body?.productId) {
    throw createError({ statusCode: 400, statusMessage: 'productId is required.' })
  }

  // B2B 5a: a signed-in trade buyer adds to Stratum's trade cart. Only the product, the chosen options and a quantity
  // are taken from the browser; the price, the rules and the stock are Stratum's. Retail falls through untouched.
  if (tradeCartOn(event)) {
    const variation = Array.isArray(body.variation) ? body.variation : undefined
    // Stratum joins to its item by the WooCommerce product id it has on record, else by SKU. A product page sends the
    // SKU of the chosen variation; a quick-add from a card does not, so ask WooCommerce for the (simple) product's SKU.
    const sku = await skuForAdd(event, Number(body.productId), (body as any).sku)
    return toWcCart(event, await cartOrThrow(event, 'cart_add', { wc_product_id: Number(body.productId), qty: Number(body.quantity ?? 1), variation, sku }))
  }

  // Optional chosen attribute values for a variable product (0b-B11): passed
  // through to the Store API's add-item `variation` field. Validated to a
  // short list of short strings -- WC itself validates the values.
  let variation: { attribute: string; value: string }[] | undefined
  if (body.variation !== undefined) {
    const ok = Array.isArray(body.variation) && body.variation.length <= 10 && body.variation.every(
      (v: any) => v && typeof v.attribute === 'string' && typeof v.value === 'string'
        && v.attribute.length > 0 && v.attribute.length <= 100 && v.value.length <= 200,
    )
    if (!ok) {
      throw createError({ statusCode: 400, statusMessage: 'variation must be a list of {attribute, value} strings.' })
    }
    variation = (body.variation as { attribute: string; value: string }[]).map(v => ({ attribute: v.attribute, value: v.value }))
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const wcSession = getRawCookie(event, `wc-session-${tenantId}`) ?? undefined
  const store     = createWcStoreClient(creds.url)
  const { data, session } = await store.addItem(body.productId, body.quantity ?? 1, wcSession, variation)

  if (session) setRawCookie(event, `wc-session-${tenantId}`, session, { httpOnly: true, sameSite: 'lax', path: '/' })
  return data
})
