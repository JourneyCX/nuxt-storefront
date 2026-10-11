import { createWcClient } from '~/server/utils/woocommerce'
import { fetchWooCredentials, fetchPublishedCollection } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// Proxies Store_builder_api::published_collection() for meta + productIds,
// then resolves full WcProduct data for those ids directly via WC (no CI3
// WC call needed — see products()'s `include` param, which only Studio's
// preview uses; the live storefront already talks to WC itself for
// everything else, so it does the same here). orderby: 'include' preserves
// the merchant's manual product ordering within the collection.
// getRawQuery(), NOT h3's own getQuery() -- see index.get.ts's identical
// comment for why (confirmed live 2026-09-26, ERR_INVALID_URL).
import { shapeProducts } from '~/server/utils/tradePricing'

export default defineEventHandler(async (event) => {
  const config      = useRuntimeConfig()
  const tenantId    = event.context.tenantId as number
  const slug        = getRouterParam(event, 'slug')!
  const query       = getRawQuery(event)
  const previewTheme = typeof query.previewTheme === 'string' ? query.previewTheme : undefined

  const collection = await fetchPublishedCollection(config.stratumInternalUrl, tenantId, slug, previewTheme)
  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: `Collection "${slug}" not found.` })
  }

  if (collection.productIds.length === 0) {
    return { collection, products: [] }
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    return { collection, products: [] }
  }

  const wc = createWcClient(creds.url, creds.key, creds.secret)
  const listed = await wc.getProducts({ include: collection.productIds, orderby: 'include' })
  // B2B (Session 4): a trade buyer sees only what their catalog admits, at their price; Shop window hides prices.
  const shaped = await shapeProducts(event, listed)
  if (shaped.unmatched.length) event.node.res.setHeader('X-Trade-Unmatched', String(shaped.unmatched.length))

  return { collection, products: shaped.items }
})
