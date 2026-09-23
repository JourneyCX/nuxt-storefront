import { fetchCategoryProductTemplate } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// Same-origin proxy for Store_builder_api::resolve_category_template() --
// used by pages/product/[slug].vue's category-specific template override.
// Same reasoning as server/api/published-page.get.ts: keeps
// config.stratumInternalUrl server-only.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query  = getRawQuery(event)

  // Number('') is 0, not NaN -- filtering empty segments before the numeric
  // conversion (not after) matters for a genuinely empty/omitted param,
  // which would otherwise become [0] instead of [] and skip the early
  // return below. Never hit by the real caller (pages/product/[slug].vue
  // only calls this endpoint when it already has a non-empty list), but a
  // direct/malformed request should still get the documented null-if-empty
  // behaviour rather than querying the backend with a bogus category id 0.
  const categoryIds = (query.categoryIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number)
    .filter((n) => !Number.isNaN(n))

  if (categoryIds.length === 0) {
    return null
  }

  return fetchCategoryProductTemplate(config.stratumInternalUrl, Number(query.tenantId), categoryIds)
})
