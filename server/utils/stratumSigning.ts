import { createHash, createHmac, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'

// Signed server-to-server calls to Stratum's public endpoints (platform request security, B2B Session 2).
// Mirrors application/helpers/stratum_request_security_helper.php:
//   HMAC-SHA256(secret, tenantId \n timestamp \n nonce \n sha256(body) \n clientIp)
// sent as X-Stratum-Tenant / -Timestamp / -Nonce / -Client-Ip / -Signature. The secret is the master option
// stratum_public_hmac_secret, held here as runtime config (STRATUM_PUBLIC_HMAC_SECRET). Fails closed when unset.

export function clientIp(event: H3Event): string {
  const headers = event.node.req.headers
  // X-Real-IP is set by our nginx from $remote_addr (a client cannot choose it); the LAST X-Forwarded-For entry is the
  // address nginx itself saw. Never the first entry: that part is client-supplied.
  const real = String(headers['x-real-ip'] ?? '').trim()
  if (real) return real
  const xff = String(headers['x-forwarded-for'] ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (xff.length) return xff[xff.length - 1]
  return event.node.req.socket?.remoteAddress?.replace(/^::ffff:/, '') ?? ''
}

/** Read the request body as text, refusing anything over $maxBytes. */
export function readTextLimited(event: H3Event, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    event.node.req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) { reject(createError({ statusCode: 413, statusMessage: 'The upload is too large.' })); event.node.req.destroy(); return }
      chunks.push(chunk)
    })
    event.node.req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    event.node.req.on('error', reject)
  })
}

export async function stratumSignedPost<T = any>(event: H3Event, path: string, rawBody: string): Promise<{ status: number; data: T | null; retryAfter?: string }> {
  const config = useRuntimeConfig()
  const secret = String((config as any).stratumPublicHmacSecret || '')
  if (!secret) throw createError({ statusCode: 503, statusMessage: 'Trade applications are not available right now.' })
  const tenantId  = String(event.context.tenantId ?? '')
  const ip        = clientIp(event)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce     = randomBytes(16).toString('hex')
  const signature = createHmac('sha256', secret)
    .update([tenantId, timestamp, nonce, createHash('sha256').update(rawBody).digest('hex'), ip].join('\n'))
    .digest('hex')

  const res = await $fetch.raw<T>(`${config.stratumInternalUrl}/b2b_public/${path}`, {
    method: 'POST',
    body: rawBody, // the exact bytes that were signed
    headers: {
      'Content-Type': 'application/json',
      'X-Stratum-Tenant': tenantId,
      'X-Stratum-Timestamp': timestamp,
      'X-Stratum-Nonce': nonce,
      'X-Stratum-Client-Ip': ip,
      'X-Stratum-Signature': signature,
    },
    ignoreResponseError: true,
  }).catch(() => null)

  if (!res) throw createError({ statusCode: 502, statusMessage: 'We could not reach the server. Please try again shortly.' })
  return { status: res.status, data: (res._data ?? null) as T | null, retryAfter: res.headers.get('retry-after') ?? undefined }
}
