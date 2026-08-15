import { getRawCookie, getRawBody } from '~/server/utils/http-compat'
import { selectShippingCheckoutRate } from '~/server/utils/stratum'
import type { ShippingCheckoutRate }  from '~/server/utils/stratum'

// Persists the shopper's chosen Shipping_checkout rate (works for all
// providers -- The Courier Guy, Bob Go, WooCommerce-native alike). Separate
// from the WC-native-only shipping-rate.post.ts, which additionally mutates
// the shopper's real WC cart -- checkout.vue calls that one too, but only
// when rate.provider === 'woocommerce_native'.
export default defineEventHandler(async (event) => {
  const config     = useRuntimeConfig()
  const tenantId   = event.context.tenantId   as number
  const wooStoreId = event.context.wooStoreId as number | null
  const body       = await getRawBody<{ rate: ShippingCheckoutRate }>(event)

  if (!body?.rate) {
    throw createError({ statusCode: 400, statusMessage: 'rate is required.' })
  }
  if (!wooStoreId) {
    throw createError({ statusCode: 503, statusMessage: 'Shipping provider not resolvable for this store.' })
  }

  const sessionToken = getRawCookie(event, `shipping-session-${tenantId}`)
  if (!sessionToken) {
    throw createError({ statusCode: 400, statusMessage: 'No shipping session -- request rates first.' })
  }

  return selectShippingCheckoutRate(config.stratumInternalUrl, wooStoreId, sessionToken, body.rate, tenantId)
})
