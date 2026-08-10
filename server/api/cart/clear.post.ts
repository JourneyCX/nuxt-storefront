import { createWcStoreClient } from '~/server/utils/woocommerce'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import { getRawCookie, setRawCookie } from '~/server/utils/http-compat'

// Off-site gateways (PayFast) don't empty the shopper's WooCommerce cart at
// Store API checkout time -- WC only clears carts natively when the
// shopper's browser visits its own "order received" page, which this
// headless storefront never renders (order-confirmation.vue reads order
// status via REST v3 instead). Confirmed live: right after a "successful"
// PayFast checkout call, GET /api/cart still returns items_count: 1 with
// the purchased item still in it. There's no bulk "empty cart" route on the
// Store API, so this removes each line item the same way removeItem()
// already does for the shopper-initiated case, threading the
// Cart-Token/Nonce session through each call. Called by order-confirmation.vue
// once a redirect-gateway order is confirmed genuinely paid.
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const wcSession = getRawCookie(event, `wc-session-${tenantId}`) ?? undefined
  const store     = createWcStoreClient(creds.url)

  let { data: cart, session } = await store.getCart(wcSession)
  for (const item of cart.items) {
    const result = await store.removeItem(item.key, session ?? undefined)
    cart    = result.data
    session = result.session
  }

  if (session) setRawCookie(event, `wc-session-${tenantId}`, session, { httpOnly: true, sameSite: 'lax', path: '/' })
  return cart
})
