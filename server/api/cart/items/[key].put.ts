import { createWcStoreClient } from '~/server/utils/woocommerce'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import { getRawCookie, setRawCookie, getRawBody } from '~/server/utils/http-compat'

export default defineEventHandler(async (event) => {
  const config    = useRuntimeConfig()
  const tenantId  = event.context.tenantId as number
  const itemKey   = getRouterParam(event, 'key')!
  const body      = await getRawBody<{ quantity: number }>(event)

  if (!body?.quantity || body.quantity < 1) {
    throw createError({ statusCode: 400, statusMessage: 'quantity must be at least 1.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const wcSession = getRawCookie(event, `wc-session-${tenantId}`) ?? undefined
  const store     = createWcStoreClient(creds.url)
  const { data, session } = await store.updateItem(itemKey, body.quantity, wcSession)

  if (session) setRawCookie(event, `wc-session-${tenantId}`, session, { httpOnly: true, sameSite: 'lax', path: '/' })
  return data
})
