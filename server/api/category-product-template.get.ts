import { fetchCategoryProductTemplate } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// Same-origin proxy for Store_builder_api::resolve_category_template() --
// used by pages/product/[slug].vue's category-specific template override.
// Same reasoning as server/api/published-page.get.ts: keeps
// config.stratumInternalUrl server-only.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query  = getRawQuery(event)

  const categoryIds = (query.categoryIds || '')
    .split(',')
    .map(Number)
    .filter((n) => !Number.isNaN(n))

  if (categoryIds.length === 0) {
    return null
  }

  return fetchCategoryProductTemplate(config.stratumInternalUrl, Number(query.tenantId), categoryIds)
})
