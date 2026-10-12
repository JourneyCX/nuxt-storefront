import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { getRawCookie, setRawCookie, deleteRawCookie } from '~/server/utils/http-compat'
import { stratumSignedPost } from '~/server/utils/stratumSigning'

// B2B Session 4: trade login state for the merchant's storefront.
//
// A trade buyer signs in at /trade/login. Stratum (CI3) verifies the password, owns the session record and re-checks
// the company on every call; this file only keeps the browser's cookie and asks Stratum, signed, what that cookie
// currently means. Nothing here is a source of truth for who may see what.
//
//   cookie  stratum-trade-{tenantId}   {tid, sid, iat} + HMAC, HttpOnly, Secure, SameSite=Lax, 12 h
//   sid     a random id; Stratum stores only its SHA-256 (idle 2 h / absolute 12 h / revocable)
//   mode    open | shop_window | hybrid | closed, per storefront host (Stratum: B2B > Storefront)
//
// The cookie's HMAC uses the same app secret as the customer-account cookie but a different prefix, so one cookie can
// never be replayed as the other, and the tenant id inside it stops a cookie from one tenant working on another.

export type StorefrontMode = 'open' | 'shop_window' | 'hybrid' | 'closed'

export interface TradeBuyer {
  contact_id:   number
  company_id:   number
  company_name: string
  contact_name: string
  location_id:  number | null
}

export interface TradeState {
  enabled:     boolean                 // B2B is on for this tenant
  mode:        StorefrontMode | 'off'
  windowPrice: 'hidden' | 'retail'
  publicPages: string[]                // closed portal: company-info slugs an anonymous visitor may open
  buyer:       TradeBuyer | null       // the signed-in contact, whether or not the company is active
  active:      boolean                 // signed in AND the company is approved and not on hold
  onHold:      boolean
  checkout:    boolean                 // Session 5a: trade ordering is switched on for this tenant (Stratum decides; read live with the session)
}

export const TRADE_OFF: TradeState = { enabled: false, mode: 'off', windowPrice: 'hidden', publicPages: [], buyer: null, active: false, onHold: false, checkout: false }

const MODE_TTL_MS = 30_000
const modeMemo = new Map<string, { at: number; value: Omit<TradeState, 'buyer' | 'active' | 'onHold' | 'checkout'> }>()
const modeInflight = new Map<string, Promise<Omit<TradeState, 'buyer' | 'active' | 'onHold' | 'checkout'>>>()

const COOKIE_TTL_SECONDS = 12 * 60 * 60

function secret(): string {
  const s = useRuntimeConfig().accountSessionSecret as string
  if (!s) throw createError({ statusCode: 500, statusMessage: 'Trade session is not configured.' })
  return s
}

function mac(body: string): string {
  return createHmac('sha256', secret()).update('trade|' + body).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function tradeCookieName(tenantId: number): string {
  return `stratum-trade-${tenantId}`
}

export function setTradeCookie(event: H3Event, tenantId: number, sid: string): void {
  const body = Buffer.from(JSON.stringify({ tid: tenantId, sid, iat: Math.floor(Date.now() / 1000) })).toString('base64url')
  setRawCookie(event, tradeCookieName(tenantId), `${body}.${mac(body)}`, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: COOKIE_TTL_SECONDS })
}

export function clearTradeCookie(event: H3Event, tenantId: number): void {
  deleteRawCookie(event, tradeCookieName(tenantId), { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
}

/** The session id in a valid, tenant-bound, unexpired cookie, or null. */
export function readTradeSid(event: H3Event, tenantId: number): string | null {
  const raw = getRawCookie(event, tradeCookieName(tenantId))
  if (!raw) return null
  const [body, sig] = raw.split('.')
  if (!body || !sig || !safeEqual(sig, mac(body))) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as { tid: number; sid: string; iat: number }
    if (p.tid !== tenantId || typeof p.sid !== 'string' || !/^[0-9a-f]{64}$/.test(p.sid)) return null
    if (typeof p.iat !== 'number' || p.iat + COOKIE_TTL_SECONDS < Math.floor(Date.now() / 1000)) return null
    return p.sid
  } catch {
    return null
  }
}

/** One signed JSON call to Stratum's b2b_public endpoints. Never throws on a Stratum answer; throws 502 when unreachable. */
export async function tradeCall<T = any>(event: H3Event, path: string, body: Record<string, unknown> = {}) {
  return stratumSignedPost<T>(event, path, JSON.stringify(body))
}

export function requestHost(event: H3Event): string {
  const h = event.node.req.headers
  return String((h['x-forwarded-host'] as string) || (h['host'] as string) || '').split(',')[0].trim().toLowerCase()
}

type ModeValue = Omit<TradeState, 'buyer' | 'active' | 'onHold' | 'checkout'>

/** Mode for this storefront host, memoised for 30 s (a change takes effect within about half a minute). */
async function modeFor(event: H3Event, tenantId: number): Promise<ModeValue> {
  const host = requestHost(event)
  const key = `${tenantId}|${host}`
  const hit = modeMemo.get(key)
  if (hit && Date.now() - hit.at < MODE_TTL_MS) return hit.value
  let p = modeInflight.get(key)
  if (!p) {
    p = (async () => {
      const secretSet = String((useRuntimeConfig() as any).stratumPublicHmacSecret || '') !== ''
      if (!secretSet) return { ...TRADE_OFF } // signing not configured: this deployment cannot offer trade features
      let res = await tradeCall<any>(event, 'storefront_mode', { host }).catch(() => null)
      if (res && res.status === 404) return { ...TRADE_OFF }  // B2B is not enabled for this tenant
      if (!res || res.status !== 200 || !res.data?.success) {
        // One quick retry: a single slow or throttled answer must not take the whole store down.
        await new Promise(r => setTimeout(r, 400))
        res = await tradeCall<any>(event, 'storefront_mode', { host }).catch(() => null)
        if (res && res.status === 404) return { ...TRADE_OFF }
      }
      if (!res || res.status !== 200 || !res.data?.success) {
        console.error('[trade] storefront_mode failed for', host, '- status', res ? res.status : 'no answer')
        throw createError({ statusCode: 503, statusMessage: 'Store is temporarily unavailable.' })
      }
      const d = res.data
      const mode = (['open', 'shop_window', 'hybrid', 'closed'] as const).includes(d.mode) ? d.mode as StorefrontMode : 'hybrid'
      return {
        enabled: true, mode, windowPrice: d.window_price === 'retail' ? 'retail' : 'hidden',
        publicPages: Array.isArray(d.public_pages) ? d.public_pages.map((s: unknown) => String(s).toLowerCase()) : [],
      } as ModeValue
    })()
    modeInflight.set(key, p)
    p.finally(() => modeInflight.delete(key)).catch(() => {})
  }
  try {
    const value = await p
    modeMemo.set(key, { at: Date.now(), value })
    return value
  } catch (e) {
    // Stratum unreachable: keep the last known mode rather than guess (a closed portal must stay closed).
    if (hit) return hit.value
    throw e
  }
}

// A page load makes several internal API calls (product, related, variations ...), each running this middleware, and
// each would ask Stratum the same thing within milliseconds. The answer is remembered for 2 seconds per session (and
// shared while a call is in flight), so a page costs one check, not ten. 2 seconds keeps "a hold or a deactivation
// takes effect on the next page load" true: a new page load a few seconds later asks Stratum again.
const SESSION_MEMO_MS = 2000
const sessionMemo = new Map<string, { at: number; res: { status: number; data: any } | null }>()
const sessionInflight = new Map<string, Promise<{ status: number; data: any } | null>>()

export function forgetSession(tenantId: number, sid: string): void {
  sessionMemo.delete(`${tenantId}|${sid}`)
}

async function checkSession(event: H3Event, tenantId: number, sid: string): Promise<{ status: number; data: any } | null> {
  const key = `${tenantId}|${sid}`
  const hit = sessionMemo.get(key)
  if (hit && Date.now() - hit.at < SESSION_MEMO_MS) return hit.res
  let p = sessionInflight.get(key)
  if (!p) {
    p = tradeCall<any>(event, 'trade_session', { sid }).then(r => ({ status: r.status, data: r.data })).catch(() => null)
    sessionInflight.set(key, p)
    p.finally(() => sessionInflight.delete(key)).catch(() => {})
  }
  const res = await p
  // Only definite answers are remembered (an error or a throttle is asked again at once).
  if (res && (res.status === 200 || res.status === 401)) sessionMemo.set(key, { at: Date.now(), res })
  if (sessionMemo.size > 2000) { for (const k of sessionMemo.keys()) { sessionMemo.delete(k); if (sessionMemo.size < 1000) break } }
  return res
}

/** Resolve (once per request) what this visitor is: tenant mode + the signed-in buyer, checked live with Stratum. */
export async function resolveTrade(event: H3Event): Promise<TradeState> {
  const tenantId = event.context.tenantId as number | undefined
  if (!tenantId) return TRADE_OFF
  const m = await modeFor(event, tenantId)
  if (!m.enabled) return TRADE_OFF
  const state: TradeState = { ...m, buyer: null, active: false, onHold: false, checkout: false }
  const sid = readTradeSid(event, tenantId)
  if (!sid) return state
  const res = await checkSession(event, tenantId, sid)
  if (res && res.status === 200 && res.data?.success) {
    state.buyer  = res.data.buyer as TradeBuyer
    state.active = !!res.data.active
    state.onHold = !res.data.active && res.data.reason === 'on_hold'
    state.checkout = res.data.checkout === true
  } else if (res && res.status === 401) {
    clearTradeCookie(event, tenantId) // revoked, expired, contact deactivated, company declined
  }
  // Any other answer: treat this request as anonymous. Never grant trade access on an error.
  return state
}

/** The active trade buyer for a request (null for anonymous, on hold, or a retail tenant). */
export function activeBuyer(event: H3Event): TradeBuyer | null {
  const t = event.context.trade as TradeState | undefined
  return t && t.enabled && t.active ? t.buyer : null
}

export function tradeState(event: H3Event): TradeState {
  return (event.context.trade as TradeState | undefined) ?? TRADE_OFF
}
