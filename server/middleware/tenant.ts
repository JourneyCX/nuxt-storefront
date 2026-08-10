import { defineEventHandler, createError } from 'h3'

export interface TenantContext {
  tenantId: number
  woocommerceUrl: string | null
  wooStoreId: number | null
}

export default defineEventHandler(async (event) => {
  const path = event.path ?? ''
  const isApiPath = path.startsWith('/api/')

  const config = useRuntimeConfig()

  // Read headers directly from the Node.js IncomingMessage -- h3's getHeader()
  // and getRequestHost() both call event.req.headers.get() which is a Web API
  // method unavailable on Node.js IncomingMessage headers (plain object).
  const rawHeaders = event.node.req.headers
  const hostname =
    (rawHeaders['x-forwarded-host'] as string) ||
    (rawHeaders['host'] as string) ||
    ''

  if (!hostname) {
    // Non-API page requests always carry a real browser Host header; only an
    // /api/ path can plausibly be a server-to-server call with no Host worth
    // resolving against (see the invalidate.post.ts case below).
    if (isApiPath) return
    throw createError({ statusCode: 400, statusMessage: 'No hostname' })
  }

  const data = await $fetch<TenantContext>(
    `${config.stratumInternalUrl}/admin/store_builder_api/tenant_by_domain`,
    { query: { domain: hostname } }
  ).catch(() => null)

  if (!data || !data.tenantId) {
    // FIX (2026-07-31): previously this middleware returned early for every
    // /api/ path BEFORE even attempting resolution, so event.context.tenantId
    // was never set for /api/cart, /api/products, /api/categories, etc. --
    // those route handlers all read event.context.tenantId directly and
    // silently failed with "WooCommerce not provisioned." on every real
    // tenant, all the time. Cart/checkout/product-listing were broken
    // storefront-wide. Now: resolution is attempted for /api/ paths the same
    // as page paths (the Host header is present either way for a real
    // browser request), and only a genuinely-unresolvable /api/ request
    // (e.g. invalidate.post.ts, called server-to-server by Stratum without a
    // tenant-domain Host header, and which already resolves its own
    // tenantId from its POST body instead) falls through without throwing --
    // matching its old behaviour exactly. Non-API page requests still throw
    // a hard 404, unchanged.
    if (isApiPath) return
    throw createError({
      statusCode: 404,
      statusMessage: `No store found for domain: ${hostname}`,
    })
  }

  event.context.tenantId       = data.tenantId
  event.context.woocommerceUrl = data.woocommerceUrl
  // Bob Go's / the shipping-provider architecture's store identifier for
  // this tenant (Store_builder_model::resolve_woo_store_id) -- null if the
  // tenant has no WC credentials yet, or no matching channel-store row
  // exists. Consumed by cart/shipping-rates.post.ts to call
  // shipping_checkout/rates via the provider-agnostic factory instead of
  // hitting WooCommerce's Store API directly.
  event.context.wooStoreId     = data.wooStoreId ?? null
  // useState is not available in Nitro server middleware -- client-side
  // tenantId persistence is handled in [...slug].vue via useState there.
})
