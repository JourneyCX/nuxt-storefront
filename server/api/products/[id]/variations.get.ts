import { createWcClient }   from '~/server/utils/woocommerce'
import { fetchWooCredentials } from '~/server/utils/stratum'
import { tradeState } from '~/server/utils/tradeContext'
import { applyWindow, shapeVariations } from '~/server/utils/tradePricing'

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
  const variations = await wc.getVariations(productId)

  // B2B (Session 4): untouched for a retail visitor; Shop window hides prices; a trade buyer gets Stratum's per-variant
  // price, tiers, quantity rule and stock, and never a variation Stratum cannot match.
  const t = tradeState(event)
  if (!t.enabled || (!t.active && t.mode !== 'shop_window')) return variations
  if (!t.active) return variations.map(v => applyWindow(event, v))
  const parent = await wc.getProduct(productId)
  return shapeVariations(event, String(parent?.sku ?? ''), variations)
})
