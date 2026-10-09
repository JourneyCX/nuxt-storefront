import { readTextLimited, stratumSignedPost } from '~/server/utils/stratumSigning'

// Browser -> here -> Stratum (HMAC-signed). The browser sends JSON with the documents base64-encoded
// (15 MB of files is about 20 MB of base64). Stratum does all validation again; this route only forwards,
// adds the browser's User-Agent for the consent record, and passes the answer through.
const MAX_BODY = 23 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const raw = await readTextLimited(event, MAX_BODY)
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request.' })
  }
  body.user_agent = String(event.node.req.headers['user-agent'] ?? '').slice(0, 255)

  const res = await stratumSignedPost<Record<string, unknown>>(event, 'apply', JSON.stringify(body))
  if (res.status === 404) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  if (res.status === 429) {
    event.node.res.statusCode = 429
    if (res.retryAfter) event.node.res.setHeader('Retry-After', res.retryAfter)
    return res.data ?? { success: false, throttled: true, errors: { _: 'Too many applications. Please try again later.' } }
  }
  if (res.status === 403 || res.status >= 500 || !res.data) {
    throw createError({ statusCode: 502, statusMessage: 'We could not submit your application. Please try again shortly.' })
  }
  if (res.status >= 400) event.node.res.statusCode = res.status
  return res.data
})
