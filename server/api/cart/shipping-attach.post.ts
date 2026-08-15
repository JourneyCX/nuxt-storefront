import { getRawBody, getRawCookie } from '~/server/utils/http-compat'
import { attachOrderShippingLine }  from '~/server/utils/woocommerce'
import { fetchWooCredentials, fetchSelectedShippingCheckoutRate } from '~/server/utils/stratum'

// Called once, right after a successful /api/cart/checkout, only when the
// shopper's selected rate came from an external provider (Courier Guy/Bob
// Go). Re-reads the *persisted* Shipping_checkout selection rather than
// trusting a client-submitted rate/price here -- the session-token cookie
// proves which session this is, but the price itself always comes from the
// server-side selection saved by shipping-select.post.ts, so a shopper can't
// alter what gets charged by tampering with this request's body.
export default defineEventHandler(async (event) => {
  const config     = useRuntimeConfig()
  const tenantId   = event.context.tenantId   as number
  const wooStoreId = event.context.wooStoreId as number | null
  const body       = await getRawBody<{ order_id: number }>(event)

  if (!body?.order_id) {
    throw createError({ statusCode: 400, statusMessage: 'order_id is required.' })
  }
  if (!wooStoreId) {
    return { attached: false, reason: 'Shipping provider not resolvable for this store.' }
  }

  const sessionToken = getRawCookie(event, `shipping-session-${tenantId}`)
  if (!sessionToken) {
    return { attached: false, reason: 'No shipping selection for this session.' }
  }

  const { rate } = await fetchSelectedShippingCheckoutRate(
    config.stratumInternalUrl, wooStoreId, sessionToken, tenantId
  ).catch(() => ({ rate: null }))

  if (!rate) {
    return { attached: false, reason: 'No shipping selection found.' }
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    return { attached: false, reason: 'WooCommerce not provisioned.' }
  }

  try {
    const updated = await attachOrderShippingLine(
      creds.url,
      creds.key,
      creds.secret,
      body.order_id,
      `external_${rate.provider}`,
      `${rate.courier_name ?? rate.provider} - ${rate.service_name}`,
      rate.price
    )
    return { attached: true, rate, order_total: updated.total }
  } catch {
    return { attached: false, reason: 'Could not attach shipping to the order.' }
  }
})
