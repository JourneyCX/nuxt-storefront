import { createWcClient }   from '~/server/utils/woocommerce'
import { fetchWooCredentials } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    return []
  }

  const q     = getRawQuery(event)
  const wc    = createWcClient(creds.url, creds.key, creds.secret)

  const products = await wc.getProducts({
    category:  q.category  as string | undefined,
    search:    q.search    as string | undefined,
    page:      q.page      ? Number(q.page)      : 1,
    per_page:  q.per_page  ? Number(q.per_page)  : 12,
    orderby:   (q.orderby as string) || 'date',
    order:     (q.order   as 'asc' | 'desc') || 'desc',
    min_price: q.min_price ? Number(q.min_price) : undefined,
    max_price: q.max_price ? Number(q.max_price) : undefined,
  })

  return products
})
