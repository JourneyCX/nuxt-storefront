import type { H3Event } from 'h3'
import { requestHost, tradeState } from '~/server/utils/tradeContext'

// Shared guards for server/api/trade/*.

/** The /api/trade routes exist only for a tenant with B2B on; otherwise they look like any unknown route. */
export function requireTradeEnabled(event: H3Event): void {
  if (!tradeState(event).enabled) throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

/**
 * A state-changing request must come from this storefront's own pages: Origin (or Referer) host = our host.
 * SameSite=Lax on the cookie is the first defence; this is the second (login CSRF, forced sign-out).
 */
export function requireSameOrigin(event: H3Event): void {
  const h = event.node.req.headers
  const src = String(h['origin'] || h['referer'] || '')
  let host = ''
  try { host = new URL(src).host.toLowerCase() } catch { host = '' }
  if (!host || host !== requestHost(event)) {
    throw createError({ statusCode: 403, statusMessage: 'Request not allowed.' })
  }
}

export function userAgent(event: H3Event): string {
  return String(event.node.req.headers['user-agent'] || '').slice(0, 255)
}
