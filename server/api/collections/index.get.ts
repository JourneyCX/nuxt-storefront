import { fetchPublishedCollections } from '~/server/utils/stratum'

// Proxies Store_builder_api::published_collections() — same shape as
// categories.get.ts. No WC call needed here: name/image/item_count are all
// CI3-native (see Store_builder_model::get_collections()'s item_count join).
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  return fetchPublishedCollections(config.stratumInternalUrl, tenantId)
})
