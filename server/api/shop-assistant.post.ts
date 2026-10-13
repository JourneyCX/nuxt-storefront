import { clientIp, readTextLimited, stratumSignedPost } from '~/server/utils/stratumSigning'

// POST /api/shop-assistant -- the ONLY way the Shop Assistant bubble and the AI block reach Stratum (2026-10-13).
// The browser sends just { mode, messages }. It never holds a key and never chooses the system prompt: this server signs
// the call (HMAC, same gate as /b2b_public) and Stratum looks up the merchant's own key and prompt itself. The shopper's
// real address travels inside the signature so Stratum's per-IP limit is per shopper, not per this server.
const MODES = new Set(['recommender', 'planner', 'assistant'])

export default defineEventHandler(async (event) => {
  const tenantId = event.context.tenantId as number | undefined
  if (!tenantId) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  // A browser page of this very storefront only (login-CSRF style guard, also stops other sites burning credits).
  const h = event.node.req.headers
  const src = String(h['origin'] || h['referer'] || '')
  let host = ''
  try { host = new URL(src).host.toLowerCase() } catch { host = '' }
  const ours = String(h['x-forwarded-host'] || h['host'] || '').toLowerCase()
  if (!host || host !== ours) throw createError({ statusCode: 403, statusMessage: 'Request not allowed.' })

  let raw = ''
  try { raw = await readTextLimited(event, 24 * 1024) } catch { throw createError({ statusCode: 413, statusMessage: 'Message too long.' }) }
  let body: any
  try { body = JSON.parse(raw) } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid request.' }) }

  const messages = Array.isArray(body?.messages) ? body.messages.slice(-20) : []
  const clean = messages
    .map((m: any) => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content ?? '').slice(0, 4000) }))
    .filter((m: any) => m.content.trim() !== '')
  if (!clean.length) throw createError({ statusCode: 400, statusMessage: 'No messages provided.' })

  // only these two fields leave this server; anything else the browser sent (systemPrompt, key, endpoint) is dropped
  const out = JSON.stringify({ mode: MODES.has(body?.mode) ? body.mode : 'assistant', messages: clean })
  const res = await stratumSignedPost<any>(event, '/api/ai/storefront_chat', out)
  setResponseStatus(event, res.status || 502)
  if (res.retryAfter) setResponseHeader(event, 'Retry-After', res.retryAfter)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const d = res.data
  if (!d || typeof d !== 'object') return { success: false, error: 'unavailable', message: 'The assistant is not available right now.' }
  // pass on only what the widgets read
  return { success: !!d.success, content: d.content, error: d.error, message: d.message }
})
