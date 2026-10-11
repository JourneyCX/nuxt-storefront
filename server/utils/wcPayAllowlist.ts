// What the /wc-pay proxy may forward to the internal WooCommerce host.
//
// B2B Session 4, 2026-10-11. Before this the proxy forwarded ANY path, so
// /wc-pay/wp-json/wc/store/v1/products returned the whole catalogue to an anonymous visitor
// (a closed-portal leak, and a leak of the unfiltered range in every mode).
//
// The list below was built from what the pay flow really requested, taken from the nginx access logs of
// founders, burnstein (i-haven.com), 80 and 82 (about 1,250 proxied requests across real PayFast sandbox
// checkouts), then confirmed by a live Playwright checkout after deploy. Everything else is refused:
// wp-json, ?rest_route=, wp-admin, wp-login, xmlrpc, feeds, sitemaps, wc-ajax, author/search enumeration.
//
//   GET|POST checkout/order-pay/{id}/?key=...         the pay page (and its form post)
//   GET      checkout/order-received/{id}/?key=...    kept for gateways that land there
//   GET      cart/?cancel_order=...                   the cancel link WooCommerce signs
//   GET|POST /?wc-api=WC_Gateway_PayFast              the PayFast notification (ITN)
//   GET      wp-includes/(js|css)/..., wp-content/plugins/woocommerce/assets/...,
//            wp-content/plugins/woocommerce-payfast-gateway/..., wp-content/themes/{theme}/assets/...
//            static files only (js, css, fonts, images)

const STATIC_EXT = /\.(?:js|css|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|ico)$/i
const STATIC_DIRS = [
  /^wp-includes\/(?:js|css|fonts)\//,
  /^wp-content\/plugins\/woocommerce\/assets\//,
  /^wp-content\/plugins\/woocommerce-payfast-gateway\//,
  /^wp-content\/themes\/[a-z0-9_-]+\/assets\//,
]
// Query keys that make WordPress answer from its REST/feed/enumeration routes whatever the path is.
const FORBIDDEN_QUERY_KEYS = ['rest_route', 'feed', 'author', 's', 'p', 'page_id', 'attachment_id', 'wc-ajax', 'cat', 'tag', 'm', 'name', 'pagename', 'sitemap']

export function isWcPayAllowed(slug: string, method: string, query: Record<string, unknown>): boolean {
  // Raw, un-decoded path only: no encoding tricks, no dot segments, no doubled slashes.
  if (slug.includes('%') || slug.includes('..') || slug.includes('\\') || slug.includes('//') || slug.includes('\0')) return false
  for (const k of FORBIDDEN_QUERY_KEYS) if (k in query) return false

  const m = method.toUpperCase()

  // Root: only the legacy WooCommerce API callbacks (the PayFast ITN).
  if (slug === '') {
    const api = query['wc-api']
    return (m === 'GET' || m === 'POST') && typeof api === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(api)
  }

  if (/^checkout\/order-pay\/\d{1,12}\/?$/.test(slug)) {
    return (m === 'GET' || m === 'POST' || m === 'HEAD') && typeof query['key'] === 'string'
  }
  if (/^checkout\/order-received\/\d{1,12}\/?$/.test(slug)) {
    return (m === 'GET' || m === 'HEAD') && typeof query['key'] === 'string'
  }
  if (/^cart\/?$/.test(slug)) {
    return (m === 'GET' || m === 'HEAD') && query['cancel_order'] !== undefined
  }

  if (m !== 'GET' && m !== 'HEAD') return false
  return STATIC_EXT.test(slug) && STATIC_DIRS.some(re => re.test(slug))
}

/** The media proxy serves wp-content/uploads only; never a path that can climb out of it. */
export function isWcMediaAllowed(slug: string): boolean {
  if (!slug || slug.includes('%') || slug.includes('..') || slug.includes('\\') || slug.includes('//') || slug.includes('\0')) return false
  return STATIC_EXT.test(slug) || /\.(?:pdf|mp4|webm|avif)$/i.test(slug)
}
