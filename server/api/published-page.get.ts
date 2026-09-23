import { fetchPublishedPage } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// Same-origin proxy for Store_builder_api::published_page() -- used by
// pages/product/[slug].vue and pages/blog/[slug].vue for their normal
// (non-preview) theme-driven page fetch. Those pages previously called
// fetchPublishedPage() directly, reading config.stratumInternalUrl from
// component code -- deliberately server-only (nuxt.config.ts), so it works
// during SSR but resolves to undefined the moment that code runs client-side
// instead. See server/api/preview/page.get.ts's fuller comment -- same bug
// class, confirmed live 2026-09-23 for the theme-preview route specifically.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query  = getRawQuery(event)

  return fetchPublishedPage(config.stratumInternalUrl, Number(query.tenantId), query.slug)
})
