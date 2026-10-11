import { getRawBody } from '~/server/utils/http-compat'
import { tradeCall } from '~/server/utils/tradeContext'
import { requireSameOrigin, requireTradeEnabled } from '~/server/utils/tradeApi'

// POST /api/trade/set-password  {c, k, password}
// Stratum checks the single-use key (invite 48 h, reset 1 h), the password rules, sets it and ends every session of
// that contact. The buyer then signs in with the new password.
export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  requireSameOrigin(event)
  const body = await getRawBody<{ c?: number | string; k?: string; password?: string }>(event).catch(() => undefined)
  const res = await tradeCall<any>(event, 'trade_password_set', {
    contact_id: Number(body?.c ?? 0), key: String(body?.k ?? ''), password: String(body?.password ?? '').slice(0, 200),
  })
  if (res.status === 200 && res.data?.success) return { ok: true }
  if (res.status === 429) throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Please try again later.' })
  throw createError({ statusCode: 422, statusMessage: String(res.data?.error || 'This link is no longer valid. Request a new one.') })
})
