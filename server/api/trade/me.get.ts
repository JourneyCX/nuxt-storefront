import { tradeState } from '~/server/utils/tradeContext'

// GET /api/trade/me -- what the storefront needs to draw the header and the buy buttons. The state was already
// resolved (and checked live with Stratum) by server/middleware/trade.ts for this very request.
export default defineEventHandler((event) => {
  const t = tradeState(event)
  if (!t.enabled) return { enabled: false }
  return {
    enabled:     true,
    mode:        t.mode,
    windowPrice: t.windowPrice,
    signedIn:    t.active,
    onHold:      t.onHold,
    creditHold:  t.active && t.creditHold,
    checkout:    t.active && t.checkout,
    company:     t.buyer ? t.buyer.company_name : null,
    name:        t.buyer ? t.buyer.contact_name : null,
  }
})
