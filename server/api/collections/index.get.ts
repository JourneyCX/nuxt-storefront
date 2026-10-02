import { fetchPublishedCollections } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// Proxies Store_builder_api::published_collections() — same shape as
// categories.get.ts. No WC call needed here: name/image/item_count are all
// CI3-native (see Store_builder_model::get_collections()'s item_count join).
// ?previewTheme= forwarded straight through to fetchPublishedCollections()'s
// theme-scoping — theme-PREVIEW mode only, see its own comment for why.
// getRawQuery(), NOT h3's own getQuery() -- confirmed live 2026-09-26 that
// getQuery() hard-crashes every call to this route with ERR_INVALID_URL on
// this deployment's actual Node runtime (ships event.node.req.url as a
// path, not an absolute URL, which is exactly what http-compat.ts's own
// docblock already documents for this same class of h3 helper).
export default defineEventHandler(async (event) => {
  const config      = useRuntimeConfig()
  const tenantId    = event.context.tenantId as number
  const query       = getRawQuery(event)
  const previewTheme = typeof query.previewTheme === 'string' ? query.previewTheme : undefined
  return fetchPublishedCollections(config.stratumInternalUrl, tenantId, previewTheme)
})
