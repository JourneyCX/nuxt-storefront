import { fetchWooCredentials } from '~/server/utils/stratum'
import { getRawQuery }          from '~/server/utils/http-compat'

// GET /api/orders/{id}?key={order_key}
//
// Guest-safe order lookup for the PayFast return flow (order-confirmation
// page). Uses the admin WC REST v3 credentials (never exposed to the
// browser) rather than the Store API guest cart session, because by the
// time the shopper's browser returns from PayFast there is no guarantee the
// original wc-session cookie/cart-token survived the off-site round trip.
// The order_key query param is WooCommerce's own standard proof-of-ownership
// token (the same one its native order-received page checks) -- without a
// match, nothing about the order is returned.
//
// Deliberately returns a minimal, non-sensitive subset -- not the raw WC v3
// order object, which includes full billing PII, line items, customer
// notes, etc. that this public, unauthenticated endpoint has no business
// exposing.
interface WcV3OrderMinimal {
  id: number
  status: string
  order_key: string
  currency: string
  total: string
  date_created: string
  billing: { first_name: string; email: string }
  payment_method_title: string
}

export interface OrderConfirmation {
  id: number
  status: string
  currency: string
  total: string
  firstName: string
  email: string
  paymentMethodTitle: string
}

function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const orderId  = Number(getRouterParam(event, 'id'))
  const key      = getRawQuery(event).key

  if (!orderId || !key) {
    throw createError({ statusCode: 400, statusMessage: 'order id and key are required.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const auth = 'Basic ' + Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')

  const order = await $fetch<WcV3OrderMinimal>(
    `${creds.url.replace(/\/$/, '')}/wp-json/wc/v3/orders/${orderId}`,
    { headers: { Authorization: auth } }
  ).catch(() => null)

  if (!order || !safeEquals(String(order.order_key), String(key))) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
  }

  const result: OrderConfirmation = {
    id:                 order.id,
    status:             order.status,
    currency:           order.currency,
    total:              order.total,
    firstName:          order.billing?.first_name ?? '',
    email:              order.billing?.email ?? '',
    paymentMethodTitle: order.payment_method_title,
  }
  return result
})
