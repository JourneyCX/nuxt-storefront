import { getRawBody } from '~/server/utils/http-compat'
import { setTradeCookie, tradeCall } from '~/server/utils/tradeContext'
import { requireSameOrigin, requireTradeEnabled, userAgent } from '~/server/utils/tradeApi'

// POST /api/trade/login  {email, password}
// Stratum checks the password (Perfex hasher), the contact, the company and the lockouts; this route only sets the
// signed HttpOnly cookie. Every failure reads the same, so nobody can tell which accounts exist.
export default defineEventHandler(async (event) => {
  requireTradeEnabled(event)
  requireSameOrigin(event)
  const tenantId = event.context.tenantId as number
  const body = await getRawBody<{ email?: string; password?: string }>(event).catch(() => undefined)
  const email = String(body?.email ?? '').trim().slice(0, 254)
  const password = String(body?.password ?? '').slice(0, 200)
  if (!email || !password) throw createError({ statusCode: 400, statusMessage: 'Enter your email and password.' })

  const res = await tradeCall<any>(event, 'trade_login', { email, password, user_agent: userAgent(event) })
  if (res.status === 200 && res.data?.success && res.data.session?.sid) {
    setTradeCookie(event, tenantId, res.data.session.sid)
    return { ok: true, company: res.data.session.company_name, name: res.data.session.contact_name }
  }
  if (res.status === 429) {
    if (res.retryAfter) event.node.res.setHeader('Retry-After', res.retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Please try again later.' })
  }
  if (res.status === 404) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  if (res.status >= 500 || res.status === 403) throw createError({ statusCode: 503, statusMessage: 'Sign-in is not available right now. Please try again shortly.' })
  throw createError({ statusCode: 401, statusMessage: 'The email or password is not right.' })
})
