import { fetchSiteSettings, fetchPreviewSiteSettings } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

// GET /api/contact-info[?previewTheme=...]
//
// The store's public contact details (phone, email, address) for the Contact Details block. These are the same values
// the footer already shows. In a theme preview they come from the previewed theme's own settings, like the rest of its
// chrome, never from a tenant. Anything unreachable answers nulls: the block then simply omits those rows.
//
// Headers are set on event.node.res: h3's own setHeader() is not usable on this deployment's runtime (see http-compat.ts).
export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig()
  const q       = getRawQuery(event)
  const preview = typeof q.previewTheme === 'string' && q.previewTheme ? q.previewTheme : null

  const s: any = preview
    ? await fetchPreviewSiteSettings(config.stratumInternalUrl, /^\d+$/.test(preview) ? { themeId: Number(preview) } : { slug: preview }).catch(() => null)
    : await fetchSiteSettings(config.stratumInternalUrl, event.context.tenantId as number).catch(() => null)

  event.node.res.setHeader('Cache-Control', 'private, no-store')
  return {
    phone:   s?.contactPhone   ?? null,
    email:   s?.contactEmail   ?? null,
    address: s?.contactAddress ?? null,
  }
})
