import { createWcClient }   from '~/server/utils/woocommerce'
import { fetchWooCredentials } from '~/server/utils/stratum'

// Keyed by the parent's own WC product id (not slug) -- the product detail
// page already has product.value.id in hand after loading /api/products/
// [slug], and WC's own /products/{id}/variations endpoint takes the numeric
// parent id, so resolving a slug a second time here would be redundant.
export default defineEventHandler(async (event) => {
  const config    = useRuntimeConfig()
  const tenantId  = event.context.tenantId as number
  const productId = Number(getRouterParam(event, 'id'))

  if (!productId) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric product id is required.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 404, statusMessage: `Product "${productId}" not found.` })
  }

  const wc = createWcClient(creds.url, creds.key, creds.secret)
  return wc.getVariations(productId)
})
