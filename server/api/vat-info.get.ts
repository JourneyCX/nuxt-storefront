import { fetchSiteSettings } from '~/server/utils/stratum'

// GET /api/vat-info
//
// Whether the store's VAT wording may be shown to the shopper (VAT-1, 2026-10-14). True only when the merchant is
// VAT-registered TODAY (Stratum decides, from its registration periods). Anything else -- not registered, or Stratum not
// reachable -- is false, so the storefront never claims "VAT included" it cannot back up (spec VR-2).
//
// Headers are set on event.node.res: h3's own setHeader() is not usable on this deployment's runtime (see http-compat.ts).
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const s: any   = await fetchSiteSettings(config.stratumInternalUrl, tenantId).catch(() => null)
  event.node.res.setHeader('Cache-Control', 'private, no-store')

  return { vatApplies: s?.vatApplies === true }
})
