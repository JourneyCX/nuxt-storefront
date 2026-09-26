import { createWcClient } from '~/server/utils/woocommerce'
import { fetchWooCredentials, fetchPublishedCollection } from '~/server/utils/stratum'

// Proxies Store_builder_api::published_collection() for meta + productIds,
// then resolves full WcProduct data for those ids directly via WC (no CI3
// WC call needed — see products()'s `include` param, which only Studio's
// preview uses; the live storefront already talks to WC itself for
// everything else, so it does the same here). orderby: 'include' preserves
// the merchant's manual product ordering within the collection.
export default defineEventHandler(async (event) => {
  const config      = useRuntimeConfig()
  const tenantId    = event.context.tenantId as number
  const slug        = getRouterParam(event, 'slug')!
  const query       = getQuery(event)
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
  const products = await wc.getProducts({ include: collection.productIds, orderby: 'include' })

  return { collection, products }
})
