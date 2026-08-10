import type { H3Event } from 'h3'

// WHY THIS PROXY EXISTS AT ALL: same root cause as wcPayProxy.ts -- the
// internal WooCommerce host (tenant-N.wc.stratumengage.com) has no public
// DNS record, 127.0.0.1-only via /etc/hosts on the WC server itself. Server-
// to-server calls Stratum/Nuxt initiate themselves resolve it fine, but
// WooCommerce always serves *its own hosted media* (anything it sideloaded
// via the product `images` REST field) back with a src pointing at its own
// site URL -- i.e. that same unreachable host. A shopper's browser trying to
// load a product image directly hits an unresolvable hostname and gets a
// broken image, confirmed live (curl from off-server: could not resolve
// host). rewriteImageUrls() in woocommerce.ts rewrites every image src this
// app returns to a relative /wc-media/... path instead, and this route
// proxies that back to the real file on the WC host -- no DNS/TLS changes
// needed, mirrors the /wc-pay proxy's approach exactly.
//
// GET-only, no auth, no cookies -- this is public product media, the same
// thing wp-content/uploads always is on a normal WordPress site.
export async function handleWcMediaProxy(event: H3Event) {
  const wcUrl = event.context.woocommerceUrl as string | null
  if (!wcUrl) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const rawUrl  = event.node.req.url ?? ''
  const qIndex  = rawUrl.indexOf('?')
  const rawPath = qIndex === -1 ? rawUrl : rawUrl.slice(0, qIndex)
  const slug    = rawPath.replace(/^\/wc-media\/?/, '')
  const target  = `${wcUrl.replace(/\/$/, '')}/wp-content/uploads/${slug}`

  const upstream = await fetch(target)

  if (!upstream.ok || !upstream.body) {
    throw createError({ statusCode: upstream.status || 404, statusMessage: 'Image not found.' })
  }

  const contentType = upstream.headers.get('content-type')
  if (contentType) {
    event.node.res.setHeader('Content-Type', contentType)
  }
  // Product photos don't change once uploaded (a re-upload gets a new
  // filename via WordPress's own unique-name handling) -- safe to cache
  // aggressively at the edge/browser.
  event.node.res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

  return upstream.body
}
