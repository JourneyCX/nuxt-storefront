import { createWcStoreClient } from '~/server/utils/woocommerce'
import type { WcAddress } from '~/server/utils/woocommerce'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import { getRawCookie, setRawCookie, getRawBody } from '~/server/utils/http-compat'

// Sets the shipping address on the cart, which makes WooCommerce calculate
// shipping rates for whatever zone matches. Call this once the delivery
// address fields are filled, before showing rate options.
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const body     = await getRawBody<{ shipping_address: WcAddress }>(event)

  if (!body?.shipping_address?.city || !body?.shipping_address?.postcode || !body?.shipping_address?.country) {
    throw createError({ statusCode: 400, statusMessage: 'shipping_address.city, postcode, and country are required.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const wcSession = getRawCookie(event, `wc-session-${tenantId}`) ?? undefined
  const store     = createWcStoreClient(creds.url)
  const { data, session } = await store.updateCustomer({ shipping_address: body.shipping_address }, wcSession)

  if (session) setRawCookie(event, `wc-session-${tenantId}`, session, { httpOnly: true, sameSite: 'lax', path: '/' })
  return data
})
