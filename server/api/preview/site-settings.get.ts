import { fetchPreviewSiteSettings } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// Same-origin proxy for Store_builder_api::preview_site_settings() -- see
// server/api/preview/page.get.ts's comment for why this needed to move
// server-side (config.stratumInternalUrl is undefined in the browser).
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query  = getRawQuery(event)

  const theme = query.themeId
    ? { themeId: Number(query.themeId) }
    : { slug: query.slug }

  return fetchPreviewSiteSettings(config.stratumInternalUrl, theme)
})
