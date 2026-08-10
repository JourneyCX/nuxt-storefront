import { createWcStoreClient } from '~/server/utils/woocommerce'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import { getRawCookie, setRawCookie, getRawBody } from '~/server/utils/http-compat'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const body     = await getRawBody<{ code: string }>(event)

  if (!body?.code?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'A coupon code is required.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const wcSession = getRawCookie(event, `wc-session-${tenantId}`) ?? undefined
  const store     = createWcStoreClient(creds.url)

  // WooCommerce's Store API rejects an invalid/expired/already-applied/
  // usage-limited code with a FetchError whose .data.message carries the
  // real shopper-facing reason ("Coupon code already applied", "This coupon
  // has expired", etc.). Confirmed live that only statusMessage actually
  // survives Nitro's error response back to the browser (a custom `data`
  // property set via createError() does not -- unlike server-to-server
  // calls, this crosses a real HTTP boundary and Nitro's default error
  // serializer only sends {statusCode, statusMessage, message, url}), so
  // that's the one field this depends on. WooCommerce also HTML-entity-
  // encodes the message (esc_html()) -- decode the handful of entities it
  // actually uses so a shopper doesn't see literal "&quot;" in the error.
  let result: Awaited<ReturnType<typeof store.applyCoupon>>
  try {
    result = await store.applyCoupon(body.code.trim(), wcSession)
  } catch (err: unknown) {
    const e = err as { statusCode?: number; data?: { message?: string } }
    const raw = e?.data?.message ?? 'Invalid or expired coupon code.'
    const message = raw
      .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    throw createError({ statusCode: e?.statusCode ?? 400, statusMessage: message })
  }

  const { data, session } = result
  if (session) setRawCookie(event, `wc-session-${tenantId}`, session, { httpOnly: true, sameSite: 'lax', path: '/' })
  return data
})
