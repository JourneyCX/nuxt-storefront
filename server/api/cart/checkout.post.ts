import { createWcClient, createWcStoreClient, attachOrderCustomer, attachOrderLineItemsMeta, getSupplierNetworkMerchantProductId } from '~/server/utils/woocommerce'
import { fetchWooCredentials }  from '~/server/utils/stratum'
import type { WcCheckoutPayload } from '~/server/utils/woocommerce'
import { getRawCookie, setRawCookie, deleteRawCookie, getRawBody } from '~/server/utils/http-compat'
import { getAccountSession } from '~/server/utils/accountSession'
import { reserveSupplierNetworkStock, SupplierNetworkReservationError } from '~/server/utils/supplierNetwork'
import { randomUUID } from 'node:crypto'

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

  // ── Supplier Network: checkout-time stock reservation ─────────────────────
  // Must happen BEFORE store.checkout() creates the real WooCommerce order —
  // a Supplier Network line that can't actually be fulfilled (out of stock,
  // listing paused, price drifted since the shopper last saw it) must never
  // become a paid order in the first place. Reservation ids collected here
  // are stamped onto the real order's line items further down, once it
  // exists (see attachOrderLineItemsMeta's own docblock for why that can only
  // happen after the fact, not in this same payload).
  //
  // config.supplierNetworkCheckoutUrl unset (not deployed/configured for this
  // environment yet) is treated as "no Supplier Network integration here" —
  // every cart proceeds as an ordinary merchant-inventory checkout, not a
  // hard failure. creds.slug missing (WC credentials exist but no matching
  // companies row) is the same: Supplier Network simply can't be reached for
  // this tenant, so it's skipped rather than blocking checkout entirely for a
  // storefront that never had Supplier Network products to begin with.
  const snReservations: { productId: number; reservationId: string }[] = []

  if (config.supplierNetworkCheckoutUrl && creds.slug) {
    const { data: cart } = await store.getCart(wcSession)

    if (cart.items.length > 0) {
      const wc = createWcClient(creds.url, creds.key, creds.secret)
      const products = await wc.getProducts({ include: cart.items.map(i => i.id) })
      const productById = new Map(products.map(p => [p.id, p]))

      const snLines = cart.items
        .map(item => {
          const product = productById.get(item.id)
          const merchantNetworkProductId = product ? getSupplierNetworkMerchantProductId(product) : null
          return merchantNetworkProductId ? { item, merchantNetworkProductId } : null
        })
        .filter((l): l is { item: typeof cart.items[number]; merchantNetworkProductId: string } => l !== null)

      if (snLines.length > 0) {
        // One id ties every line in this checkout attempt together as
        // customer_order_ref on the Laravel side (diagnostic/traceability
        // only -- matching a later payment confirmation back to a
        // reservation goes through the reservation id itself, round-tripped
        // via WC order line meta, not this ref).
        const checkoutAttemptId = randomUUID()

        try {
          const results = await Promise.all(snLines.map(({ item, merchantNetworkProductId }) =>
            reserveSupplierNetworkStock(
              config.supplierNetworkCheckoutUrl,
              config.supplierNetworkCheckoutSecret,
              creds.slug!,
              {
                merchantNetworkProductId,
                productId:            item.id,
                quantity:             item.quantity,
                // Store API's prices.price is already an integer STRING in
                // the currency's minor units (e.g. "49900" for R499.00) --
                // the exact same convention Laravel's own *_minor fields use,
                // confirmed against this file's own documented convention on
                // WcCartItem.prices above. Direct pass-through, no scaling.
                expectedPriceMinor:   parseInt(item.prices.price, 10),
                // Both are separate varchar(64) columns on the Laravel side --
                // passed as distinct fields (see SupplierNetworkReservationLine)
                // rather than packed into one and split back apart, which
                // previously overflowed 64 chars and threw a raw DB error.
                customerOrderRef:     checkoutAttemptId,
                customerOrderLineRef: item.key,
              },
            ).then(reservation => ({ productId: item.id, reservationId: reservation.reservationId })),
          ))
          snReservations.push(...results)
        } catch (err: unknown) {
          // Fail the whole checkout before any WooCommerce order exists --
          // partial success (some lines reserved, one failed) is deliberately
          // not surfaced as a partial order; the shopper retries the whole
          // cart. Reservations already made for OTHER lines in this same
          // failed attempt are left to expire via the existing TTL worker
          // (sn:expire-reservations) rather than explicitly released here --
          // no cancel/release endpoint exists yet, and a short-lived orphaned
          // hold on an abandoned checkout is the same outcome an ordinary
          // cart abandonment already produces.
          const e = err as SupplierNetworkReservationError
          const reason = e?.reason ?? ''
          const message = reason === 'insufficient_stock'
            ? 'One or more items in your cart are no longer available in the requested quantity.'
            : reason.includes('price has changed')
              ? 'The price of one or more items has changed. Please refresh your cart and try again.'
              : reason === 'unknown_merchant_network_product' || reason === 'unknown_network_product'
                ? 'One or more items in your cart are no longer available.'
                : 'One or more items in your cart could not be reserved. Please try again.'
          throw createError({ statusCode: 409, statusMessage: message })
        }
      }
    }
  }

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

  // The Store API checkout call above has no idea about this app's own
  // account-session cookie -- it only knows its own anonymous cart-token
  // session, so every order comes back customer_id: 0 regardless of whether
  // the shopper is logged in. Patch it in here, server-side (not left to a
  // client-triggered follow-up call, unlike shipping-attach.post.ts, so a
  // dropped request can't silently leave a logged-in shopper's order
  // unattributed) whenever an account session is present. Best-effort: a
  // failure here must never fail the order itself, which has already been
  // placed successfully on WooCommerce's side.
  const accountSession = getAccountSession(event, tenantId)
  if (accountSession && data?.order_id) {
    await attachOrderCustomer(creds.url, creds.key, creds.secret, data.order_id, accountSession.customerId)
      .catch((e) => {
        console.error('[checkout] attachOrderCustomer failed for order', data.order_id, e)
      })
  }

  // Stamp each Supplier Network reservation onto its real order line item now
  // that the order (and its real line_items[].id values) exists — see
  // attachOrderLineItemsMeta's own docblock for why this is the earliest
  // possible point. Best-effort, same risk posture as attachOrderCustomer
  // just above: a failure here must never fail the order response, which has
  // already been placed successfully. Logged LOUDLY (not just console.error)
  // because unlike a missing customer_id, a failure here is load-bearing —
  // it silently breaks the entire downstream payment-confirmation chain for
  // this order's Supplier Network line(s) (CI3's payment_added_action has no
  // reservation_ref to read, so the order pays but its Supplier Network
  // line(s) never generate a FulfilmentOrder).
  if (snReservations.length > 0 && data?.order_id) {
    await attachOrderLineItemsMeta(creds.url, creds.key, creds.secret, data.order_id, snReservations)
      .catch((e) => {
        console.error('[checkout] SUPPLIER NETWORK: attachOrderLineItemsMeta failed for order', data.order_id, '-- reservations exist but are not linked to this order:', snReservations, e)
      })
  }

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
