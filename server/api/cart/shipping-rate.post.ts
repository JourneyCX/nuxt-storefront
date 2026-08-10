import { createWcStoreClient } from '~/server/utils/woocommerce'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import { getRawCookie, setRawCookie, getRawBody } from '~/server/utils/http-compat'

// Persists the shopper's chosen shipping rate for the current cart.
// package_id/rate_id must come from a rate object already returned by
// shipping-address.post.ts's response (cart.shipping_rates[n].shipping_rates[m]).
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const body     = await getRawBody<{ package_id: number; rate_id: string }>(event)

  if (body?.package_id === undefined || !body?.rate_id) {
    throw createError({ statusCode: 400, statusMessage: 'package_id and rate_id are required.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const wcSession = getRawCookie(event, `wc-session-${tenantId}`) ?? undefined
  const store     = createWcStoreClient(creds.url)
  const { data, session } = await store.selectShippingRate(body.package_id, body.rate_id, wcSession)

  if (session) setRawCookie(event, `wc-session-${tenantId}`, session, { httpOnly: true, sameSite: 'lax', path: '/' })
  return data
})
