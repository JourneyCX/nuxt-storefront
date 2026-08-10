import { createWcClient }   from '~/server/utils/woocommerce'
import { fetchWooCredentials } from '~/server/utils/stratum'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    return []
  }

  const wc = createWcClient(creds.url, creds.key, creds.secret)
  return wc.getCategories()
})
