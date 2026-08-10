import type { H3Event } from 'h3'
import { getRawQuery } from '~/server/utils/http-compat'

// Shared by server/routes/wc-pay/index.ts AND server/routes/wc-pay/[...slug].ts.
// Nitro's [...slug] catch-all does NOT match the bare "/wc-pay/" path with
// zero segments after it -- confirmed live: PayFast's real ITN POST to
// https://i-haven.com/wc-pay/?wc-api=WC_Gateway_PayFast (no wp-json/wc-api
// value.notify_url) 404'd at the Nitro routing layer before this handler
// ever ran, silently dropping the very callback the whole /wc-pay proxy
// exists for -- an order was paid on PayFast's side but never marked paid
// here because of it. index.ts covers exactly that bare-path case;
// [...slug].ts covers everything with a path after it (the pay page itself,
// wp-includes/* assets, etc). Both delegate here so there's exactly one
// copy of the actual proxying logic.
//
// WHY THIS PROXY EXISTS AT ALL: the internal WooCommerce host
// (tenant-N.wc.stratumengage.com) has no public DNS record -- confirmed
// live, it's 127.0.0.1-only via /etc/hosts on the WC server itself, resolved
// for server-to-server REST API calls only. It was never meant to be
// reached from the public internet. But the PayFast checkout redirect flow
// needs TWO things to reach it that are NOT server-to-server calls Stratum
// initiates itself:
//   1. GET  -- the shopper's own browser must render WooCommerce's "pay for
//      order" page (WC_Gateway_PayFast::receipt_page()), which auto-submits
//      (and, as a real <input type=submit> fallback, lets the shopper
//      manually click) a hidden form posting straight to PayFast.
//   2. POST -- PayFast's own servers must reach notify_url (the ITN
//      callback) to confirm payment server-to-server; this is rewritten to
//      point here via the woocommerce_gateway_payfast_payment_data_to_send
//      filter in stratum-headless.php.
// Standing up real public DNS + TLS for *.wc.stratumengage.com was the
// alternative (bigger, riskier infra change touching DNS/certs); proxying
// these two paths through the already-public Nuxt domain needs no DNS/TLS
// changes and keeps every external party (shopper browser, PayFast servers)
// talking only to a host that was already public. Nothing else needs this:
// PayFast's own domain is public internet, and return_url/cancel_url
// already send the shopper's browser back to Nuxt's own domain afterward
// (same filters file), not to the WC domain.
//
// GET requests need no auth (WooCommerce's own order-key query param gates
// the pay page). The ITN POST needs the REAL originating IP forwarded
// through as X-Forwarded-For -- the PayFast plugin's own is_valid_ip()
// already reads and trusts X-Forwarded-For over REMOTE_ADDR (confirmed in
// its source), specifically to support exactly this kind of proxying --
// without it, WC would see this Nuxt server's own IP and reject the ITN as
// PF_ERR_BAD_SOURCE_IP even though it's a genuine PayFast callback.
export async function handleWcPayProxy(event: H3Event) {
  const wcUrl = event.context.woocommerceUrl as string | null
  if (!wcUrl) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  // Nitro's [...slug] router param strips a trailing slash from the
  // captured segment -- confirmed live: a request for
  // /wc-pay/checkout/order-pay/22/ came through with slug="checkout/order-pay/22"
  // (no trailing slash), which WordPress then 301-redirected to fix (its
  // own canonical-URL logic), sending the browser right back to the same
  // (still slash-less once re-captured) proxied URL -- an infinite loop.
  // Parsing the path straight off the raw request URL instead preserves it
  // faithfully, the same reason http-compat.ts's getRawQuery() reads
  // event.node.req.url directly rather than trusting h3/Nitro helpers.
  const rawUrl  = event.node.req.url ?? ''
  const qIndex  = rawUrl.indexOf('?')
  const rawPath = qIndex === -1 ? rawUrl : rawUrl.slice(0, qIndex)
  const slug    = rawPath.replace(/^\/wc-pay\/?/, '')
  const query   = getRawQuery(event)
  const qs      = new URLSearchParams(query).toString()
  const target  = `${wcUrl.replace(/\/$/, '')}/${slug}${qs ? '?' + qs : ''}`
  const method  = event.node.req.method ?? 'GET'

  const rawHeaders = event.node.req.headers
  const myHost  = (rawHeaders['x-forwarded-host'] as string) || (rawHeaders['host'] as string) || ''
  const myProto = (rawHeaders['x-forwarded-proto'] as string) || 'https'
  const myOrigin = myHost ? `${myProto}://${myHost}` : ''

  const realIp = (event.node.req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? event.node.req.socket.remoteAddress
    ?? ''

  // Forward the browser's own cookies through to WooCommerce -- confirmed
  // live via a real cancelled-payment test: without this, WC_Form_Handler::
  // cancel_order() (which needs the SAME guest session that generated the
  // cancel link's _wpnonce moments earlier, on the pay page load) saw an
  // entirely cookie-less, unrelated "session" and silently failed its nonce
  // check, falling through to rendering the checkout page -- which the
  // headless lockdown then 403'd, masking the real cause behind "This
  // WooCommerce store is only accessible via the Stratum headless
  // storefront." Relaying Set-Cookie back to the browser on the way out
  // keeps this working across multiple requests in the same visit.
  const cookieHeader = event.node.req.headers['cookie']
  const proxyHeaders: Record<string, string> = { 'X-Forwarded-For': realIp }
  if (cookieHeader) proxyHeaders['Cookie'] = cookieHeader

  const init: RequestInit = { method, redirect: 'manual', headers: proxyHeaders }

  if (method === 'POST') {
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

  // Relay any Set-Cookie WooCommerce issues (session/cart cookies) back to
  // the browser, on every response including redirects -- the counterpart
  // to forwarding the browser's own Cookie header above. getSetCookie() is
  // the correct API for multiple Set-Cookie headers (headers.get() only
  // returns one, comma-joined, which corrupts cookie attribute parsing).
  // WooCommerce sets these with Domain=.wc.stratumengage.com -- confirmed
  // live this makes the browser silently DROP the cookie entirely, since a
  // response actually served from i-haven.com isn't allowed to set a cookie
  // for a different domain. Stripping the Domain attribute scopes the
  // cookie to whichever host the shopper is actually on instead, which is
  // exactly what's needed here (this proxy is same-origin with the rest of
  // the storefront from the browser's point of view).
  const setCookies = typeof resp.headers.getSetCookie === 'function' ? resp.headers.getSetCookie() : []
  if (setCookies.length) {
    const rewritten = setCookies.map(c => c.replace(/;\s*[Dd]omain=[^;]*/, ''))
    event.node.res.setHeader('Set-Cookie', rewritten)
  }

  // The pay page (GET) can itself redirect (e.g. an already-paid/invalid
  // order sent elsewhere). Same-WC-host redirects are re-routed back through
  // this proxy so the browser never sees the unreachable internal host;
  // cross-host redirects (e.g. cancel_order's final hop back to Nuxt's own
  // order-confirmation page) are passed through as a real redirect.
  if (resp.status >= 300 && resp.status < 400) {
    const location = resp.headers.get('location') ?? ''
    try {
      const locUrl = new URL(location, wcUrl)
      const wcHost = new URL(wcUrl).hostname
      const target2 = locUrl.hostname === wcHost
        ? `${myOrigin}/wc-pay${locUrl.pathname}${locUrl.search}`
        : locUrl.toString()
      // h3's sendRedirect() assumes a Fetch-API-style response under the
      // hood and doesn't behave correctly on this deployment's raw Node
      // ServerResponse -- same incompatibility family documented in
      // http-compat.ts (getCookie/getQuery/readBody all had the same
      // issue). Writing the redirect directly onto event.node.res sidesteps
      // it the same way those helpers do.
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

  // The proxied page itself contains further absolute links back to the
  // unreachable WC host -- theme/plugin asset <script src>/<link href> tags.
  // (cancel_url/notify_url/return_url are no longer touched here -- they're
  // rewritten server-side in stratum-headless.php's filters BEFORE
  // WooCommerce signs the PayFast form, since rewriting them here, after
  // signing, invalidated the signature -- confirmed live via a real PayFast
  // sandbox rejection.) Scoped to HTML responses only.
  if (contentType.includes('text/html') && myOrigin) {
    const wcOrigin = new URL(wcUrl).origin
    const replacement = `${myOrigin}/wc-pay`
    text = text.split(wcOrigin).join(replacement)
    // wc_internal_url is http://, but WordPress's own URL generation here
    // returns https:// (is_ssl() is forced true server-side for this host --
    // see wp-config.php) -- cover both so nothing is missed regardless of
    // which scheme a given piece of markup used.
    const wcOriginAltScheme = wcOrigin.startsWith('https://')
      ? wcOrigin.replace('https://', 'http://')
      : wcOrigin.replace('http://', 'https://')
    text = text.split(wcOriginAltScheme).join(replacement)
  }

  return text
}
