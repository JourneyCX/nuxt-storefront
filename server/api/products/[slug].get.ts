import { createWcClient }   from '~/server/utils/woocommerce'
import { fetchWooCredentials } from '~/server/utils/stratum'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const slug     = getRouterParam(event, 'slug')!

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 404, statusMessage: `Product "${slug}" not found.` })
  }

  const wc      = createWcClient(creds.url, creds.key, creds.secret)
  const product = await wc.getProduct(slug)

  if (!product) {
    throw createError({ statusCode: 404, statusMessage: `Product "${slug}" not found.` })
  }

  return product
})
