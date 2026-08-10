import { createWcStoreClient } from '~/server/utils/woocommerce'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import type { WcCheckoutPayload } from '~/server/utils/woocommerce'
import { getRawCookie, setRawCookie, deleteRawCookie, getRawBody } from '~/server/utils/http-compat'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const body     = await getRawBody<WcCheckoutPayload>(event)

  if (!body?.billing_address?.email) {
    throw createError({ statusCode: 400, statusMessage: 'billing_address.email is required.' })
  }
  if (!body?.payment_method) {
    throw createError({ statusCode: 400, statusMessage: 'payment_method is required.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const wcSession = getRawCookie(event, `wc-session-${tenantId}`) ?? undefined
  const store     = createWcStoreClient(creds.url)

  // WooCommerce Store API validation failures (e.g. a missing required
  // address field) throw a FetchError here whose own .data carries the real
  // { code, message, data } WooCommerce sent -- confirmed live via a real
  // "Province is required" rejection. Re-thrown via createError with that
  // real message promoted to statusMessage -- confirmed live (see
  // coupon.post.ts) that a custom `data` property set here does NOT survive
  // Nitro's error response across the real browser->server HTTP boundary
  // (only statusCode/statusMessage/message/url do), so statusMessage is the
  // only field this can rely on; placeOrder()'s catch reads it accordingly.
  let checkoutResult: Awaited<ReturnType<typeof store.checkout>>
  try {
    checkoutResult = await store.checkout(body, wcSession)
  } catch (err: unknown) {
    const e = err as { statusCode?: number; data?: { message?: string } }
    const message = e?.data?.message ?? 'Checkout failed. Please check your details and try again.'
    throw createError({ statusCode: e?.statusCode ?? 400, statusMessage: message })
  }
  const { data, session } = checkoutResult

  // Clear the cart session cookie on successful order
  deleteRawCookie(event, `wc-session-${tenantId}`)
  if (session) setRawCookie(event, `wc-session-${tenantId}`, session, { httpOnly: true, sameSite: 'lax', path: '/' })

  // Off-site gateways (PayFast today) hand back a redirect_url on the
  // internal WooCommerce host -- tenant-N.wc.stratumengage.com, which has no
  // public DNS record at all (confirmed live) and was never meant to be
  // reached by a browser. Rewrite it to go through the /wc-pay proxy on
  // THIS same public storefront domain instead -- see server/routes/wc-pay/
  // [...slug].ts for why that proxy exists. COD's redirect_url is left
  // untouched (checkout.vue never navigates to it), and this only rewrites
  // when the host actually matches the tenant's own WC install, so a
  // gateway that already returns a real public redirect (a future provider)
  // passes through unmodified.
  const redirectUrl = data?.payment_result?.redirect_url
  if (redirectUrl) {
    try {
      const wcHost = new URL(creds.url).hostname
      const rrUrl  = new URL(redirectUrl)
      if (rrUrl.hostname === wcHost) {
        const rawHeaders = event.node.req.headers
        const hostHeader = (rawHeaders['x-forwarded-host'] as string) || (rawHeaders['host'] as string) || wcHost
        const proto       = (rawHeaders['x-forwarded-proto'] as string) || 'https'
        data.payment_result.redirect_url = `${proto}://${hostHeader}/wc-pay${rrUrl.pathname}${rrUrl.search}`
      }
    } catch { /* not a parseable URL -- leave redirect_url as-is */ }
  }

  return data
})
