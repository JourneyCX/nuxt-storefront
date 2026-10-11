import { getRawBody } from '~/server/utils/http-compat'
import { tradeCall } from '~/server/utils/tradeContext'
import { requireSameOrigin, requireTradeEnabled } from '~/server/utils/tradeApi'

// POST /api/trade/password-check  {c, k}  -> {valid, kind}
// Lets the set-password page say "this link has expired" before the buyer types a password.
export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  requireSameOrigin(event)
  const body = await getRawBody<{ c?: number | string; k?: string }>(event).catch(() => undefined)
  const res = await tradeCall<any>(event, 'trade_password_check', { contact_id: Number(body?.c ?? 0), key: String(body?.k ?? '') })
  if (res.status === 429) throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Please try again later.' })
  return { valid: res.status === 200 && !!res.data?.valid, kind: res.data?.kind ?? null }
})
