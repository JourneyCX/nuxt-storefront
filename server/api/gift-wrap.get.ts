import { fetchGiftWrap } from '~/server/utils/stratum'

// Proxies Store_builder_api::published_gift_wrap() for the product page's
// "Gift wrap this" tick-box (components/storefront/GiftWrapOption.vue).
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  return fetchGiftWrap(config.stratumInternalUrl, tenantId)
})
