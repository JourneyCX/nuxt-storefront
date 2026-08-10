import type { H3Event } from 'h3'
import { getRawQuery } from '~/server/utils/http-compat'

// Shared by server/routes/returns/index.ts AND server/routes/returns/[...slug].ts,
// same split as server/routes/wc-pay/ -- Nitro's [...slug] catch-all does not match
// the bare "/returns/" path with zero segments after it (confirmed live for wc-pay's
// PayFast ITN case; same Nitro routing quirk, so the same split is used here
// pre-emptively rather than waiting to rediscover it against a real customer request).
//
// WHY THIS PROXY EXISTS: unlike /wc-pay and /wc-media, there is no DNS/reachability
// gap here -- Stratum's own app (STRATUM_INTERNAL_URL, e.g. https://shop.stratumengage.com)
// is a normal public HTTPS domain, directly reachable by any browser already. This proxy
// exists purely so a shopper never has to leave their own storefront domain to lodge or
// track a return -- modules/store_returns/controllers/Returns_portal.php's views build
// every internal link and form action with CodeIgniter's site_url(), which returns a full
// absolute https://shop.stratumengage.com/... URL, so without rewriting those the very
// first click/submit inside the proxied page would carry the shopper straight off the
// storefront and onto Stratum's own domain.
//
// Returns_portal.php resolves tenant context from a `domain` request param (see its
// _resolve_tenant()) -- nothing sets PHP session tenant_id any other way for an
// anonymous visitor, so that param is appended to every proxied request's query string
// here (works for GET and POST alike, since PHP's $_GET is populated from the query
// string regardless of request method).
export async function handleReturnsProxy(event: H3Event) {
  const config = useRuntimeConfig()
  const stratumUrl = config.stratumInternalUrl as string

  const rawHeaders = event.node.req.headers
  const myHost  = (rawHeaders['x-forwarded-host'] as string) || (rawHeaders['host'] as string) || ''
  const myProto = (rawHeaders['x-forwarded-proto'] as string) || 'https'
  const myOrigin = myHost ? `${myProto}://${myHost}` : ''

  if (!myHost) {
    throw createError({ statusCode: 400, statusMessage: 'No hostname' })
  }

  // Parse straight off the raw request URL rather than trusting h3/Nitro's slug
  // capture -- same reasoning as wcPayProxy.ts (a captured [...slug] param has its
  // trailing slash stripped, which caused a real redirect loop against WordPress's
  // own canonical-URL logic there; Stratum's redirect() calls are less likely to hit
  // that specific case, but parsing the raw URL costs nothing and stays consistent).
  const rawUrl  = event.node.req.url ?? ''
  const qIndex  = rawUrl.indexOf('?')
  const rawPath = qIndex === -1 ? rawUrl : rawUrl.slice(0, qIndex)
  const query   = getRawQuery(event)
  query.domain  = myHost
  const qs      = new URLSearchParams(query).toString()
  const target  = `${stratumUrl.replace(/\/$/, '')}${rawPath}${qs ? '?' + qs : ''}`
  const method  = event.node.req.method ?? 'GET'

  // Forward the shopper's cookies (PHP session id) through to Stratum so the
  // multi-step return flow's session data (verified order, in-progress form state)
  // survives across requests, and relay Set-Cookie back out below.
  const cookieHeader = event.node.req.headers['cookie']
  const proxyHeaders: Record<string, string> = {}
  if (cookieHeader) proxyHeaders['Cookie'] = cookieHeader

  const init: RequestInit = { method, redirect: 'manual', headers: proxyHeaders }

  if (method === 'POST') {
    // Raw byte passthrough -- works identically for a urlencoded form post and a
    // multipart/form-data evidence-photo upload, same as wcPayProxy.ts's POST
    // handling. No multipart parsing/reassembly needed since the body is never
    // inspected here, only relayed.
    const raw = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      event.node.req.on('data', (c: Buffer) => chunks.push(c))
      event.node.req.on('end', () => resolve(Buffer.concat(chunks)))
      event.node.req.on('error', reject)
    })
    init.body = raw
    init.headers = {
      ...init.headers,
      'Content-Type': event.node.req.headers['content-type'] ?? 'application/x-www-form-urlencoded',
    }
  }

  const resp = await fetch(target, init)

  // Relay Set-Cookie (PHP session cookie) back to the browser, stripping any
  // Domain attribute so it scopes to whichever storefront host the shopper is
  // actually on -- same fix already proven necessary for WooCommerce's session
  // cookie in wcPayProxy.ts, applied here defensively even though Stratum's own
  // cookie config is not yet confirmed to set an explicit Domain attribute.
  const setCookies = typeof resp.headers.getSetCookie === 'function' ? resp.headers.getSetCookie() : []
  if (setCookies.length) {
    const rewritten = setCookies.map(c => c.replace(/;\s*[Dd]omain=[^;]*/, ''))
    event.node.res.setHeader('Set-Cookie', rewritten)
  }

  // Every internal link/form action in the portal views is built with site_url(),
  // an absolute https://shop.stratumengage.com/... URL -- a same-host redirect (e.g.
  // after a successful lookup/submit) needs rewriting back through this proxy's own
  // origin, or the shopper's browser would be sent straight off the storefront domain.
  if (resp.status >= 300 && resp.status < 400) {
    const location = resp.headers.get('location') ?? ''
    try {
      const locUrl = new URL(location, stratumUrl)
      const stratumHost = new URL(stratumUrl).hostname
      const target2 = locUrl.hostname === stratumHost
        ? `${myOrigin}${locUrl.pathname}${locUrl.search}`
        : locUrl.toString()
      // h3's sendRedirect() assumes a Fetch-API-style response and doesn't behave
      // correctly on this deployment's raw Node ServerResponse -- same
      // incompatibility documented in http-compat.ts; writing directly to
      // event.node.res sidesteps it the same way those helpers do.
      event.node.res.statusCode = resp.status
      event.node.res.setHeader('Location', target2)
      event.node.res.end()
      return
    } catch { /* not a parseable Location -- fall through and proxy the body */ }
  }

  const contentType = resp.headers.get('content-type') ?? 'text/html; charset=utf-8'
  event.node.res.statusCode = resp.status
  event.node.res.setHeader('Content-Type', contentType)

  let text = await resp.text()

  // Rewrite every absolute Stratum-origin link/form action in the returned HTML
  // (all produced by site_url()) to this proxy's own origin, so clicking or
  // submitting anything inside the page stays on the storefront's domain and
  // keeps going through this same proxy. The portal's layout is fully
  // self-contained (CDN Bootstrap/jQuery/Font Awesome, inline <style>, no
  // reference to Stratum's own asset bundles), so no other rewriting is needed.
  if (contentType.includes('text/html') && myOrigin) {
    const stratumOrigin = new URL(stratumUrl).origin
    text = text.split(stratumOrigin).join(myOrigin)
  }

  return text
}
