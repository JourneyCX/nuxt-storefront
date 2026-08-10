// Server-side WooCommerce API client.
// All calls use WC REST API v3 with Basic auth (consumer key + secret).
// Credentials come from Stratum and NEVER reach the browser.

export interface WcProduct {
  id:          number
  name:        string
  slug:        string
  permalink:   string
  price:       string
  regular_price: string
  sale_price:  string
  on_sale:     boolean
  stock_status: 'instock' | 'outofstock' | 'onbackorder'
  images:      { src: string; alt: string }[]
  categories:  { id: number; name: string; slug: string }[]
  short_description: string
  description: string
  variations:  number[]
  type:        string
}

export interface WcCategory {
  id:     number
  name:   string
  slug:   string
  count:  number
  image:  { src: string; alt: string } | null
}

export interface WcCartItem {
  key:       string
  id:        number
  quantity:  number
  name:      string
  // WooCommerce Store API nests price under prices.price as a MINOR-UNIT
  // string (e.g. "49900" for R499.00 at currency_minor_unit 2), confirmed
  // against a real live cart response -- there is no flat item.price field.
  // Divide by 10 ** currency_minor_unit, the same convention already used
  // for cart.totals.total_price below.
  prices:    { price: string; currency_symbol: string; currency_minor_unit: number }
  images:    { src: string; alt: string }[]
}

// A single selectable shipping option within a package (e.g. "Flat rate").
// rate_id is the opaque "{method_id}:{instance_id}" string the Store API
// expects back verbatim in select-shipping-rate — treat it as a token, not
// something to parse.
export interface WcShippingRate {
  rate_id:      string
  name:         string
  description:  string
  delivery_time: string
  price:        string
  taxes:        string
  instance_id:  number
  method_id:    string
  selected:     boolean
}

// One "package" of items needing a shipping choice. Simple carts have exactly
// one package; WooCommerce's Store API always wraps rates in this structure
// even so, so the shape is kept faithful to the real response rather than
// flattened for the common case.
export interface WcShippingPackage {
  package_id:  number
  name:        string
  destination: { address_1: string; address_2: string; city: string; state: string; postcode: string; country: string }
  shipping_rates: WcShippingRate[]
}

// A coupon currently applied to the cart, as returned by the Store API's
// cart.coupons array -- totals.total_discount is a minor-unit string, same
// convention as everything else under cart.totals.
export interface WcCartCoupon {
  code:           string
  discount_type:  string
  totals: {
    total_discount:     string
    total_discount_tax: string
  }
}

export interface WcCart {
  items:              WcCartItem[]
  items_count:        number
  needs_shipping:     boolean
  has_calculated_shipping: boolean
  shipping_address:   WcAddress
  shipping_rates:     WcShippingPackage[]
  coupons:            WcCartCoupon[]
  // Gateway ids enabled and available for the current cart (e.g. ['cod'] or
  // ['cod','payfast']) -- the Store API's own live view of what's actually
  // usable right now (respects each gateway's is_available() -- a gateway a
  // merchant configured but that failed to activate on WooCommerce won't
  // appear here even if Stratum's own config row says otherwise). Drives the
  // checkout payment-method selector instead of a hardcoded COD-only radio.
  payment_methods:    string[]
  totals: {
    total_price:    string
    total_shipping: string | null
    total_discount: string
    currency_code:  string
    currency_symbol: string
    currency_minor_unit: number
  }
}

// The internal WC host (tenant-N.wc.stratumengage.com) has no public DNS --
// fine for the server-to-server REST/Store API calls this file makes, but
// WooCommerce always serves *media it hosts itself* (anything sideloaded via
// a product's `images` field, including on cart line items) back with a src
// pointing at that same unreachable host, so a shopper's browser can't load
// it directly (confirmed live: unresolvable off-server). Rewrite every such
// src to a relative /wc-media/... path instead, proxied back to the real
// file by server/routes/wc-media/[...slug].ts -- see wcMediaProxy.ts for the
// full rationale (same pattern as the /wc-pay checkout proxy).
// Scheme-agnostic on purpose: wc_internal_url is stored as plain http:// by
// design (TLS terminates at the public edge, see is_ssl() override on the
// WC side), but WooCommerce's own APIs return media src as https://
// regardless -- a strict prefix match against `root` (which keeps whichever
// scheme the stored credential URL happens to use) silently failed to match
// real https:// image srcs against an http:// root, confirmed live (rewrite
// was a no-op, images stayed broken even after this fix first landed).
// Match on host + path only. Shared by both the REST v3 client (product,
// category images) and the Store API client (cart line item images) --
// previously only the REST v3 client had this, so cart images were never
// rewritten at all and stayed broken even after the REST v3 fix landed.
function makeImageRewriter(root: string) {
  const uploadsHostPath = root.replace(/^https?:\/\//, '') + '/wp-content/uploads/'
  return function rewriteImageSrc(src: string): string {
    const bare = src.replace(/^https?:\/\//, '')
    return bare.startsWith(uploadsHostPath) ? '/wc-media/' + bare.slice(uploadsHostPath.length) : src
  }
}

export function createWcClient(baseUrl: string, key: string, secret: string) {
  const auth = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64')
  const root = baseUrl.replace(/\/$/, '')

  async function get<T>(path: string, query: Record<string, string | number> = {}): Promise<T> {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      params.set(k, String(v))
    }
    const qs  = params.toString()
    const url = `${root}/wp-json/wc/v3${path}${qs ? '?' + qs : ''}`
    return $fetch<T>(url, { headers: { Authorization: auth } })
  }

  const rewriteImageSrc = makeImageRewriter(root)
  function rewriteProductImages(p: WcProduct): WcProduct {
    return { ...p, images: (p.images || []).map(img => ({ ...img, src: rewriteImageSrc(img.src) })) }
  }
  function rewriteCategoryImage(c: WcCategory): WcCategory {
    return c.image ? { ...c, image: { ...c.image, src: rewriteImageSrc(c.image.src) } } : c
  }

  return {
    // ── Products ────────────────────────────────────────────────────────────
    async getProducts(opts: {
      category?:  string
      search?:    string
      page?:      number
      per_page?:  number
      orderby?:   string
      order?:     'asc' | 'desc'
      slug?:      string
      min_price?: number
      max_price?: number
    } = {}): Promise<WcProduct[]> {
      const q: Record<string, string | number> = {}
      // WooCommerce's REST API `category` filter takes numeric term ID(s), not
      // slugs (confirmed against the live API: passing a slug string silently
      // matches zero products, no error) -- every Puck component only ever
      // exposes "category slug" fields to the merchant, so resolve here rather
      // than pushing that WC quirk out to every caller. Accepts a comma-separated
      // list (ProductFilter's multi-select) -- WC's own `category` param takes a
      // comma list of IDs and matches any of them (OR), same as the checkboxes.
      if (opts.category) {
        const slugs = opts.category.split(',').map(s => s.trim()).filter(Boolean)
        const ids   = (await Promise.all(slugs.map(s => this.getCategoryIdBySlug(s)))).filter((id): id is number => id !== null)
        if (ids.length === 0) return [] // unknown slug(s) -- no products, not an error
        q.category = ids.join(',')
      }
      if (opts.search)     q.search      = opts.search
      if (opts.page)       q.page        = opts.page
      if (opts.per_page)   q.per_page    = opts.per_page
      if (opts.orderby)    q.orderby     = opts.orderby
      if (opts.order)      q.order       = opts.order
      if (opts.slug)       q.slug        = opts.slug
      if (opts.min_price != null) q.min_price = opts.min_price
      if (opts.max_price != null) q.max_price = opts.max_price
      const products = await get<WcProduct[]>('/products', q)
      return products.map(rewriteProductImages)
    },

    async getProduct(idOrSlug: number | string): Promise<WcProduct | null> {
      if (typeof idOrSlug === 'number') {
        const p = await get<WcProduct>(`/products/${idOrSlug}`).catch(() => null)
        return p ? rewriteProductImages(p) : null
      }
      const list = await get<WcProduct[]>('/products', { slug: idOrSlug }).catch(() => [] as WcProduct[])
      return list[0] ? rewriteProductImages(list[0]) : null
    },

    // ── Categories ──────────────────────────────────────────────────────────
    async getCategories(per_page = 50): Promise<WcCategory[]> {
      const categories = await get<WcCategory[]>('/products/categories', { per_page, hide_empty: 1 })
      return categories.map(rewriteCategoryImage)
    },

    async getCategoryIdBySlug(slug: string): Promise<number | null> {
      const list = await get<WcCategory[]>('/products/categories', { slug }).catch(() => [] as WcCategory[])
      return list[0]?.id ?? null
    },
  }
}

// ── WooCommerce Store API (cart/checkout — public, no consumer key needed) ──
// Proxied through Nuxt so the browser never has the WooCommerce URL.
//
// FIX (2026-07-31): mutating Store API requests (add-item, update-customer,
// select-shipping-rate, checkout) require a `Nonce` header in addition to the
// `Cart-Token` this client already tracked — WooCommerce rejects them with
// woocommerce_rest_missing_nonce otherwise. The nonce is only ever returned
// by the API itself (in the response headers of any prior request, GET
// included), so the session persisted across requests now carries both
// values together as a small JSON blob instead of the bare token string.
// Verified against the real Store API contract directly (see session notes):
// GET /cart returns `Nonce` + `Cart-Token` headers; POST endpoints require
// both back and return fresh versions of each on every response.

export function createWcStoreClient(baseUrl: string) {
  const root = baseUrl.replace(/\/$/, '')
  const rewriteImageSrc = makeImageRewriter(root)
  function rewriteCartImages(cart: WcCart): WcCart {
    return {
      ...cart,
      items: cart.items.map(item => ({
        ...item,
        images: (item.images || []).map(img => ({ ...img, src: rewriteImageSrc(img.src) })),
      })),
    }
  }

  interface SessionState { token?: string; nonce?: string }

  function parseSession(wcSession?: string): SessionState {
    if (!wcSession) return {}
    try {
      const parsed = JSON.parse(wcSession)
      return (parsed && typeof parsed === 'object') ? parsed : {}
    } catch {
      return {}
    }
  }

  async function rawRequest<T>(
    method: string,
    path: string,
    body: unknown,
    state: SessionState
  ): Promise<{ data: T; state: SessionState }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (state.token) headers['Cart-Token'] = state.token
    if (state.nonce) headers['Nonce']      = state.nonce

    const resp = await $fetch.raw<T>(`${root}/wp-json/wc/store/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const nextState: SessionState = {
      token: resp.headers.get('Cart-Token') ?? state.token,
      nonce: resp.headers.get('Nonce')      ?? state.nonce,
    }
    return { data: resp._data as T, state: nextState }
  }

  async function storeRequest<T>(
    method: string,
    path: string,
    body: unknown,
    wcSession: string | undefined,
    isMutating: boolean
  ): Promise<{ data: T; session: string | null }> {
    let state = parseSession(wcSession)

    // Mutating calls need a Nonce obtained from a prior GET. Bootstrap one
    // with a throwaway /cart read if this is the very first request of a
    // session and it happens to be a mutation (e.g. addItem before any
    // getCart() ever ran).
    if (isMutating && !state.nonce) {
      const boot = await rawRequest<unknown>('GET', '/cart', undefined, state)
      state = boot.state
    }

    const result = await rawRequest<T>(method, path, body, state)
    return { data: result.data, session: JSON.stringify(result.state) }
  }

  // Every endpoint that returns a WcCart needs its line item images
  // rewritten the same way -- wrap storeRequest once here instead of
  // repeating rewriteCartImages() at every call site below.
  async function storeRequestCart(
    method: string,
    path: string,
    body: unknown,
    wcSession: string | undefined,
    isMutating: boolean
  ): Promise<{ data: WcCart; session: string | null }> {
    const result = await storeRequest<WcCart>(method, path, body, wcSession, isMutating)
    // Checking result.data alone isn't enough -- confirmed live via a real
    // PUT /cart/items/{key} (quantity update) on a single-line-item cart:
    // WC's Store API returned a truthy body that was NOT a full cart object
    // (no .items array), which passed a bare `if (result.data)` check but
    // then crashed rewriteCartImages() on `cart.items.map`. Require the
    // shape we actually need, not just non-null.
    if (result.data?.items) {
      return { data: rewriteCartImages(result.data), session: result.session }
    }
    // WooCommerce's Store API can respond to a mutation with an empty body
    // instead of the updated cart -- confirmed live for DELETE
    // /cart/items/{key} specifically when it's the cart's last remaining
    // item. That crashed rewriteCartImages() with "Cannot read properties of
    // undefined (reading 'items')" and surfaced as a 500 to the shopper even
    // though the underlying WC cart mutation had already succeeded (a
    // follow-up GET confirmed the item really was removed). Fall back to a
    // follow-up GET using the session the mutation itself just returned,
    // rather than trusting every mutation response to carry a body.
    const fallback = await storeRequest<WcCart>('GET', '/cart', undefined, result.session ?? wcSession, false)
    return { data: rewriteCartImages(fallback.data), session: fallback.session ?? result.session }
  }

  return {
    async getCart(wcSession?: string) {
      return storeRequestCart('GET', '/cart', undefined, wcSession, false)
    },
    async addItem(productId: number, quantity: number, wcSession?: string) {
      return storeRequestCart('POST', '/cart/add-item', { id: productId, quantity }, wcSession, true)
    },
    async removeItem(cartItemKey: string, wcSession?: string) {
      return storeRequestCart('DELETE', `/cart/items/${cartItemKey}`, undefined, wcSession, true)
    },
    async updateItem(cartItemKey: string, quantity: number, wcSession?: string) {
      return storeRequestCart('PUT', `/cart/items/${cartItemKey}`, { quantity }, wcSession, true)
    },
    // Store API rejects an unknown/expired/usage-limited code with a 400
    // carrying a shopper-facing message in the response body's `message`
    // field -- left to propagate as-is (not caught here) so call sites can
    // surface that real text instead of a generic failure, same pattern
    // checkout() below already relies on.
    async applyCoupon(code: string, wcSession?: string) {
      return storeRequestCart('POST', '/cart/apply-coupon', { code }, wcSession, true)
    },
    async removeCoupon(code: string, wcSession?: string) {
      return storeRequestCart('POST', '/cart/remove-coupon', { code }, wcSession, true)
    },
    // Sets the shipping (and optionally billing) address on the cart, which
    // triggers WooCommerce to calculate rates for whatever shipping zone
    // matches. Returns the updated cart with shipping_rates populated (or an
    // empty array per package if no zone/method matches — not an error).
    async updateCustomer(address: { shipping_address: WcAddress; billing_address?: WcAddress }, wcSession?: string) {
      return storeRequestCart('POST', '/cart/update-customer', address, wcSession, true)
    },
    // package_id and rate_id come directly from a rate object already present
    // in cart.shipping_rates[n].shipping_rates[m] — never constructed manually.
    async selectShippingRate(packageId: number, rateId: string, wcSession?: string) {
      return storeRequestCart('POST', '/cart/select-shipping-rate', { package_id: packageId, rate_id: rateId }, wcSession, true)
    },
    async checkout(payload: WcCheckoutPayload, wcSession?: string) {
      return storeRequest<WcOrder>('POST', '/checkout', payload, wcSession, true)
    },
  }
}

export interface WcAddress {
  first_name: string
  last_name:  string
  company?:   string
  address_1:  string
  address_2?: string
  city:       string
  state?:     string
  postcode:   string
  country:    string
  email?:     string
  phone?:     string
}

export interface WcCheckoutPayload {
  billing_address:  WcAddress & { email: string; phone: string }
  shipping_address: WcAddress
  payment_method:   string
  payment_data?:    Record<string, string>[]
}

export interface WcOrder {
  // The Store API's /checkout response shape confirmed live -- several
  // fields a prior version of this interface assumed (id, total, currency,
  // currency_symbol, billing, payment_method_title) never actually appear in
  // the real response at all (order_id/billing_address are what's really
  // there), which silently broke the confirmation screen's totals/name for
  // every COD order. REST v3's order object (orders/[id].get.ts's own
  // WcV3OrderMinimal) is a different, correct API surface -- checkout.vue
  // now re-fetches through that endpoint (order_key proves ownership) for
  // the confirmation screen instead of trusting this response's missing
  // fields.
  order_id:        number
  order_key:       string
  status:          string
  billing_address: WcAddress & { email: string; phone: string }
  payment_method:  string
  // Present on the checkout response for gateways whose process_payment()
  // returns something other than an immediate success -- COD never needs
  // this (checkout.vue shows its inline confirmation without reading it),
  // but PayFast's redirect: $order->get_checkout_payment_url(true) (the WC
  // "pay for order" page that auto-submits to PayFast) arrives here as
  // redirect_url, and payment_status will be 'pending' until PayFast's ITN
  // callback confirms it. Confirmed against the live WooCommerce Store API
  // response shape during the payment architecture investigation.
  payment_result?: {
    payment_status:  'success' | 'failure' | 'pending' | 'error'
    payment_details: { key: string; value: string }[]
    redirect_url:    string
  }
}

// ── Order shipping-line write-through (REST v3, admin API) ──────────────────
// Attaches a shopper's Shipping_checkout-selected rate to a placed order as
// a real shipping_lines entry, for stores whose active provider is external
// (The Courier Guy/Bob Go). Not needed for provider === 'woocommerce_native':
// that rate is selected on the shopper's real cart via the existing
// shipping-rate.post.ts before checkout, so WC's own order creation already
// carries the correct total (see Woocommerce_native_provider::
// create_shipment()'s docblock).
//
// FIX: confirmed live (a real order against founders/i-haven.com, which does
// have a real WC shipping zone configured) that WooCommerce's Store API
// checkout auto-applies the store's own matched zone rate to any order whose
// cart never had an explicit rate selected on it -- not a hypothetical
// "if a merchant configures conflicting zones" edge case, the live default.
// A naive shipping_lines PUT with just the new line therefore left BOTH the
// auto-applied native line and the external one on the order (confirmed:
// R50 flat rate + R95.50 Courier Guy on the same order, total R644.50 for a
// R499 product). Tried passing existing lines back as {id} alone to delete
// them -- also confirmed live NOT to work for shipping_lines (REST v3 left
// the line untouched, same double-charge). What does work, confirmed live:
// repurposing the FIRST existing line's own id into the courier charge
// (same id, new method_id/method_title/total) rather than adding a second
// line -- WC treats a shipping_lines entry with a matching id as an update
// to that exact line, not an addition. Any additional existing lines beyond
// the first (multi-package orders) are zeroed to 0.00 by id rather than
// left charging their original native amount.
//
// REST v3 accepts an arbitrary method_id/method_title/total on shipping_lines
// without it needing to match a registered WC_Shipping_Method -- this is a
// record of what was charged, not a live rate recalculation. Basic Auth
// (key+secret), same as createWcClient()/orders/[id].get.ts above --
// deliberately NOT the Automattic\WooCommerce\Client OAuth path, which was
// root-caused (project_store_sync_broken_broadly) to corrupt any
// nested-array payload.
export async function attachOrderShippingLine(
  baseUrl:      string,
  key:          string,
  secret:       string,
  orderId:      number,
  methodId:     string,
  methodTitle:  string,
  total:        number
): Promise<{ id: number; total: string }> {
  const auth = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64')
  const root = baseUrl.replace(/\/$/, '')

  const existing = await $fetch<{ shipping_lines: { id: number; method_id: string; method_title: string }[] }>(
    `${root}/wp-json/wc/v3/orders/${orderId}`,
    { headers: { Authorization: auth } }
  )
  const [first, ...rest] = existing.shipping_lines ?? []

  const shippingLines = first
    ? [
        { id: first.id, method_id: methodId, method_title: methodTitle, total: total.toFixed(2) },
        ...rest.map(line => ({ id: line.id, method_id: line.method_id, method_title: line.method_title, total: '0.00' })),
      ]
    : [{ method_id: methodId, method_title: methodTitle, total: total.toFixed(2) }]

  return $fetch<{ id: number; total: string }>(
    `${root}/wp-json/wc/v3/orders/${orderId}`,
    {
      method:  'PUT',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: { shipping_lines: shippingLines },
    }
  )
}
