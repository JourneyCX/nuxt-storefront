import { getRawCookie, setRawCookie, getRawBody } from '~/server/utils/http-compat'
import type { WcAddress } from '~/server/utils/woocommerce'
import type { ShippingCheckoutRatesResponse } from '~/server/utils/stratum'

interface CartItemInput { productId: number; quantity: number; unitPrice?: number }

// Provider-agnostic rate lookup -- calls Stratum's shipping_checkout/rates
// endpoint, which resolves the tenant's *active* Shipping_provider_interface
// implementation via Shipping_provider_factory (The Courier Guy/Bob Go/
// WooCommerce-native, whichever this store has configured -- see
// docs/shipping_provider_architecture_investigation.md). This replaces the
// direct WC Store API cart/update-customer call for the rate-lookup step:
// the storefront no longer needs to know which provider is active, it just
// asks this one endpoint and gets back a normalized rate list.
export default defineEventHandler(async (event) => {
  const config      = useRuntimeConfig()
  const tenantId    = event.context.tenantId   as number
  const wooStoreId  = event.context.wooStoreId as number | null
  const body         = await getRawBody<{ shipping_address: WcAddress; cart_items: CartItemInput[] }>(event)

  if (!body?.shipping_address?.city || !body?.shipping_address?.postcode || !body?.shipping_address?.country) {
    throw createError({ statusCode: 400, statusMessage: 'shipping_address.city, postcode, and country are required.' })
  }
  if (!Array.isArray(body?.cart_items) || body.cart_items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'cart_items must be a non-empty array.' })
  }
  if (!wooStoreId) {
    throw createError({ statusCode: 503, statusMessage: 'Shipping provider not resolvable for this store.' })
  }

  const sessionCookieName = `shipping-session-${tenantId}`
  const sessionToken      = getRawCookie(event, sessionCookieName) ?? undefined

  const payload = {
    store_id:      wooStoreId,
    session_token: sessionToken,
    delivery_address: {
      first_name: body.shipping_address.first_name ?? '',
      last_name:  body.shipping_address.last_name  ?? '',
      street:     body.shipping_address.address_1  ?? '',
      suburb:     body.shipping_address.address_2  ?? '',
      city:       body.shipping_address.city,
      province:   body.shipping_address.state      ?? '',
      postal_code: body.shipping_address.postcode,
      country:    body.shipping_address.country,
    },
    // unit_price feeds Courier Guy/Ship Logic's declared_value (parcel
    // insurance value) -- see Courier_guy_provider::_declared_value(). Omit
    // rather than send 0 when the client didn't supply it (a native-only
    // store's rates don't depend on it at all, so this is never a hard
    // requirement).
    cart_items: body.cart_items.map(i => ({
      product_id: i.productId,
      qty:        i.quantity,
      ...(i.unitPrice !== undefined ? { unit_price: i.unitPrice } : {}),
    })),
  }

  const result = await $fetch<ShippingCheckoutRatesResponse>(
    `${config.stratumInternalUrl}/shipping_checkout/rates`,
    { method: 'POST', body: payload }
  ).catch((err) => {
    throw createError({ statusCode: 502, statusMessage: 'Shipping rate lookup failed.', data: err })
  })

  if (result.session_token) {
    setRawCookie(event, sessionCookieName, result.session_token, { httpOnly: true, sameSite: 'lax', path: '/' })
  }

  return result
})
