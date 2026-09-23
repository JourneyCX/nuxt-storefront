import { fetchThemeCss } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// Same-origin proxy for Store_builder_api::theme_css() -- see
// server/api/preview/page.get.ts's comment for why this needed to move
// server-side (config.stratumInternalUrl is undefined in the browser).
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query  = getRawQuery(event)

  const opts = query.themeId
    ? { themeId: Number(query.themeId) }
    : query.slug
      ? { slug: query.slug }
      : { tenantId: Number(query.tenantId) }

  return fetchThemeCss(config.stratumInternalUrl, opts)
})
