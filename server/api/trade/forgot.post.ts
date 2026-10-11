import { getRawBody } from '~/server/utils/http-compat'
import { tradeCall } from '~/server/utils/tradeContext'
import { requireSameOrigin, requireTradeEnabled } from '~/server/utils/tradeApi'

// POST /api/trade/forgot  {email}
// Always the same answer, whether or not the address belongs to a trade account (Stratum sends the email only when
// exactly one eligible contact matches, and limits requests per IP and per email).
export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  requireSameOrigin(event)
  const body = await getRawBody<{ email?: string }>(event).catch(() => undefined)
  const email = String(body?.email ?? '').trim().slice(0, 254)
  if (email) await tradeCall(event, 'trade_password_request', { email }).catch(() => null)
  return { ok: true }
})
