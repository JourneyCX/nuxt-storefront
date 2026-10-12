import { createWcStoreClient } from '~/server/utils/woocommerce'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import { getRawCookie, setRawCookie } from '~/server/utils/http-compat'

import { tradeCartOn, cartOrThrow, toWcCart } from '~/server/utils/tradeCart'

export default defineEventHandler(async (event) => {
  const config    = useRuntimeConfig()
  const tenantId  = event.context.tenantId as number
  const itemKey   = getRouterParam(event, 'key')!

  if (tradeCartOn(event)) { // B2B 5a
    return toWcCart(event, await cartOrThrow(event, 'cart_remove', { line_id: Number(itemKey) }))
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const wcSession = getRawCookie(event, `wc-session-${tenantId}`) ?? undefined
  const store     = createWcStoreClient(creds.url)
  const { data, session } = await store.removeItem(itemKey, wcSession)

  if (session) setRawCookie(event, `wc-session-${tenantId}`, session, { httpOnly: true, sameSite: 'lax', path: '/' })
  return data
})
