import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { getRawCookie, setRawCookie, deleteRawCookie } from '~/server/utils/http-compat'

// Signed customer-account session, mirroring the wc-session-{tenantId} cart
// cookie pattern already used by server/api/cart/index.get.ts -- a small
// tenant-namespaced cookie, set/read/cleared via the raw Node cookie helpers
// in http-compat.ts (h3's native getCookie/setCookie throw on this
// deployment's runtime -- see that file's own comment).
//
// No JWT library is added for this -- package.json has no jsonwebtoken/jose
// dependency and this deployment otherwise avoids adding new npm packages
// for things Node's own crypto module already covers. The payload is a
// single app-wide HMAC secret (not per-tenant) because tenantId is part of
// the signed payload itself, so a cookie signed for one tenant can't be
// replayed against another -- same isolation the cookie NAME already
// provides, just enforced again inside the signature.

export interface AccountSessionPayload {
  customerId: number
  tenantId:   number
  exp:        number // unix seconds
}

function secret(): string {
  const s = useRuntimeConfig().accountSessionSecret as string
  if (!s) throw createError({ statusCode: 500, statusMessage: 'Account session is not configured.' })
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function cookieName(tenantId: number): string {
  return `stratum-account-${tenantId}`
}

export function signSession(payload: AccountSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySession(raw: string | undefined, tenantId: number): AccountSessionPayload | null {
  if (!raw) return null
  const [body, mac] = raw.split('.')
  if (!body || !mac) return null
  if (!safeEqual(mac, sign(body))) return null

  let payload: AccountSessionPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'))
  } catch {
    return null
  }

  if (payload.tenantId !== tenantId) return null
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export function setAccountSession(event: H3Event, tenantId: number, customerId: number): void {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const token = signSession({ customerId, tenantId, exp })
  setRawCookie(event, cookieName(tenantId), token, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   SESSION_TTL_SECONDS,
  })
}

export function clearAccountSession(event: H3Event, tenantId: number): void {
  deleteRawCookie(event, cookieName(tenantId), { path: '/' })
}

// Shared guard for every authenticated account route (me/address/orders/logout).
// Throws a 401 rather than returning null so route handlers don't each need
// their own error branch.
export function requireAccountSession(event: H3Event, tenantId: number): AccountSessionPayload {
  const session = getAccountSession(event, tenantId)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Not logged in.' })
  }
  return session
}

// Non-throwing variant for routes where being logged in is optional (e.g.
// checkout.post.ts attaching customer_id to an order only when a session
// exists -- guest checkout must still succeed with no session at all).
export function getAccountSession(event: H3Event, tenantId: number): AccountSessionPayload | null {
  const raw = getRawCookie(event, cookieName(tenantId))
  return verifySession(raw, tenantId)
}
