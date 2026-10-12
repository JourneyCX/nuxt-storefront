import { createWcClient }   from '~/server/utils/woocommerce'
import { fetchWooCredentials, fetchPreviewScope } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'
import { shapeProducts, visibleSkus } from '~/server/utils/tradePricing'
import { activeBuyer } from '~/server/utils/tradeContext'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    return []
  }

  const q     = getRawQuery(event)
  const wc    = createWcClient(creds.url, creds.key, creds.secret)

  // Theme preview isolation (docs/specs/theme-ownership-isolation.md): a block's
  // own category is honoured exactly as set; a block with NO category shows only
  // the previewed theme's own preview categories, and none at all when the theme
  // has none configured (or can't be resolved). Never the whole shared catalogue.
  let category = q.category as string | undefined
  const previewTheme = q.previewTheme as string | undefined
  if (previewTheme && !category) {
    const scope = await fetchPreviewScope(config.stratumInternalUrl, previewTheme)
    if (!scope || scope.length === 0) return []
    category = scope.join(',')
  }

  // B2B (Session 4): ask WooCommerce for exactly the products this buyer's catalog admits. Without this a restricted
  // catalog (say two chosen products) is applied AFTER WooCommerce has already paged its newest products, so an older
  // allowed product never reaches the page.
  let allowedSkus: string[] | undefined
  const buyer = activeBuyer(event)
  if (buyer) {
    const v = await visibleSkus(event, buyer)
    if (v && v.length === 0) return []
    if (v && v.length <= 100) allowedSkus = v
  }

  const products = await wc.getProducts({
    sku:       allowedSkus,
    category,
    search:    q.search    as string | undefined,
    page:      q.page      ? Number(q.page)      : 1,
    per_page:  q.per_page  ? Number(q.per_page)  : 12,
    orderby:   (q.orderby as string) || 'date',
    order:     (q.order   as 'asc' | 'desc') || 'desc',
    min_price: q.min_price ? Number(q.min_price) : undefined,
    max_price: q.max_price ? Number(q.max_price) : undefined,
  })

  // B2B (Session 4): trade buyer = visibility + Stratum's price; Shop window = no price / no buy; anyone else untouched.
  const shaped = await shapeProducts(event, products)
  if (shaped.unmatched.length) event.node.res.setHeader('X-Trade-Unmatched', String(shaped.unmatched.length))
  return shaped.items
})
