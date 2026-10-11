import { getRawBody } from '~/server/utils/http-compat'
import { clearTradeCookie, forgetSession, readTradeSid, tradeCall } from '~/server/utils/tradeContext'
import { requireSameOrigin, requireTradeEnabled } from '~/server/utils/tradeApi'

// POST /api/trade/logout  {everywhere?: boolean}
// Revokes the session in Stratum (so a copied cookie stops working) and clears the cookie. Always succeeds from the
// browser's point of view.
export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  requireSameOrigin(event)
  const tenantId = event.context.tenantId as number
  const body = await getRawBody<{ everywhere?: boolean }>(event).catch(() => undefined)
  const sid = readTradeSid(event, tenantId)
  if (sid) await tradeCall(event, 'trade_logout', { sid, everywhere: !!body?.everywhere }).catch(() => null)
  if (sid) forgetSession(tenantId, sid)
  clearTradeCookie(event, tenantId)
  return { ok: true }
})
