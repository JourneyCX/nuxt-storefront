import { fetchPreviewPage } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// Same-origin proxy for Store_builder_api::preview_page() -- the theme
// preview route (pages/preview/[theme]/[[page]].vue) used to call
// fetchPreviewPage() directly from the page component, which reads
// config.stratumInternalUrl. That value is deliberately server-only
// (nuxt.config.ts: "Server-only — never exposed to the browser"), so it
// resolved fine during SSR but came back `undefined` the moment the SAME
// code ran again client-side (clicking a ThemePreviewBar pill triggers
// useAsyncData's `watch: [pageType]` refetch, which runs in the browser) --
// confirmed live 2026-09-23: the resulting fetch to "undefined/admin/..."
// 404'd, which the page's own 404 guard then threw as an uncaught client
// error, blanking the page. Routing through this Nitro handler instead
// means the browser only ever calls same-origin /api/preview/page -- the
// real backend URL stays server-only, exactly as designed.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query  = getRawQuery(event)

  const theme = query.themeId
    ? { themeId: Number(query.themeId) }
    : { slug: query.slug }
  const pageType = query.pageType || 'home'

  return fetchPreviewPage(config.stratumInternalUrl, theme, pageType)
})
