// FIX (2026-07-31): several h3/Nitro helpers (getCookie, setCookie, deleteCookie,
// getQuery) internally assume a Fetch-API-style request object (Headers with a
// .get() method, or a full absolute URL for `new URL()`). In this deployment's
// actual Node runtime, event.node.req is a plain Node IncomingMessage --
// headers is a plain object, not a Headers instance, and event.node.req.url is
// a path-only string, not an absolute URL. Both cause hard runtime errors
// (TypeError: event.req.headers.get is not a function; ERR_INVALID_URL) the
// moment these helpers are actually reached -- see server/middleware/tenant.ts,
// which already had to work around the same issue for its own header read.
// These are drop-in replacements, reading/writing the raw Node request/response
// directly instead of going through h3's incompatible helpers.

import type { H3Event } from 'h3'

export function getRawCookie(event: H3Event, name: string): string | undefined {
  const header = event.node.req.headers['cookie']
  if (!header) return undefined
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim())
    }
  }
  return undefined
}

export interface RawCookieOptions {
  httpOnly?: boolean
  sameSite?: 'lax' | 'strict' | 'none'
  path?:     string
  maxAge?:   number
}

function serializeCookie(name: string, value: string, opts: RawCookieOptions = {}): string {
  let str = `${name}=${encodeURIComponent(value)}`
  if (opts.path)     str += `; Path=${opts.path}`
  if (opts.httpOnly) str += `; HttpOnly`
  if (opts.sameSite) str += `; SameSite=${opts.sameSite[0].toUpperCase()}${opts.sameSite.slice(1)}`
  if (typeof opts.maxAge === 'number') str += `; Max-Age=${opts.maxAge}`
  return str
}

function appendSetCookieHeader(event: H3Event, cookieStr: string): void {
  const res      = event.node.res
  const existing = res.getHeader('Set-Cookie')
  const next     = Array.isArray(existing)
    ? [...existing, cookieStr]
    : (typeof existing === 'string' ? [existing, cookieStr] : [cookieStr])
  res.setHeader('Set-Cookie', next)
}

export function setRawCookie(event: H3Event, name: string, value: string, opts: RawCookieOptions = {}): void {
  appendSetCookieHeader(event, serializeCookie(name, value, opts))
}

export function deleteRawCookie(event: H3Event, name: string, opts: RawCookieOptions = {}): void {
  appendSetCookieHeader(event, serializeCookie(name, '', { ...opts, maxAge: 0 }))
}

// Parses the query string straight off event.node.req.url via URLSearchParams
// (which accepts a bare query string, no base URL needed) instead of h3's
// getQuery(), which constructs `new URL(event.node.req.url)` and throws
// ERR_INVALID_URL because that value is a path, not an absolute URL.
export function getRawQuery(event: H3Event): Record<string, string> {
  const url    = event.node.req.url ?? ''
  const qIndex = url.indexOf('?')
  const qs     = qIndex === -1 ? '' : url.slice(qIndex + 1)
  const params = new URLSearchParams(qs)
  const result: Record<string, string> = {}
  for (const [k, v] of params.entries()) result[k] = v
  return result
}

// h3's readBody() calls event.req.text() (a Fetch-API Request method), which
// doesn't exist on a Node IncomingMessage either -- same incompatibility
// family as the helpers above. Reads the raw request stream directly and
// JSON-parses it instead.
export function getRawBody<T = unknown>(event: H3Event): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    event.node.req.on('data', (chunk: Buffer) => chunks.push(chunk))
    event.node.req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      if (!raw) { resolve(undefined as T); return }
      try {
        resolve(JSON.parse(raw) as T)
      } catch (err) {
        reject(err)
      }
    })
    event.node.req.on('error', reject)
  })
}
