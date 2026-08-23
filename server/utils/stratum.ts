// Server-side helpers for calling the Stratum internal API.
// These run only in the Nuxt server runtime — credentials never reach the browser.

export interface PuckPageData {
  puckJson: Record<string, unknown>
}

export interface WooCredentials {
  url: string
  key: string
  secret: string
}

// Single source of truth for Header/Footer chrome + site-wide branding — see
// docs/site_settings_architecture_investigation.md. One row per tenant, fetched in
// parallel with the page JSON (both only need tenantId, so there's no serial
// dependency) and cached under the same ISR boundary as the page itself.
export interface SiteSettings {
  logoUrl: string | null
  logoAlt: string | null
  logoText: string | null
  faviconUrl: string | null
  businessName: string | null
  tagline: string | null
  description: string | null
  contactPhone: string | null
  contactEmail: string | null
  contactAddress: string | null
  socialLinks: { platform: string; url: string }[]
  navLinks: { label: string; url: string }[]
  headerBackgroundColor: string | null
  headerTextColor: string | null
  headerAccentColor: string | null
  headerSticky: boolean
  headerCtaText: string | null
  headerCtaUrl: string | null
  footerBackgroundColor: string | null
  footerTextColor: string | null
  footerAccentColor: string | null
  footerCopyrightText: string | null
  footerColumns: { heading: string; links: { label: string; url: string }[] }[]
  footerShowBrandColumn: boolean
  whatsappEnabled: boolean
  whatsappPopupEnabled: boolean
  whatsappPhone: string | null
  whatsappMessageTitle: string | null
  whatsappMessageBody: string | null
  whatsappButtonColor: string | null
}

export async function fetchSiteSettings(
  stratumUrl: string,
  tenantId: number
): Promise<SiteSettings | null> {
  return $fetch<{ settings: SiteSettings | null }>(
    `${stratumUrl}/admin/store_builder_api/site_settings`,
    { query: { tenantId } }
  ).then(r => r.settings).catch(() => null)
}

export async function fetchPublishedPage(
  stratumUrl: string,
  tenantId: number,
  slug: string
): Promise<PuckPageData | null> {
  return $fetch<PuckPageData>(
    `${stratumUrl}/admin/store_builder_api/published_page`,
    { query: { tenantId, slug } }
  ).catch(() => null)
}

export async function fetchWooCredentials(
  stratumUrl: string,
  tenantId: number
): Promise<WooCredentials | null> {
  return $fetch<WooCredentials>(
    `${stratumUrl}/admin/store_builder_api/wc_credentials`,
    { query: { tenantId } }
  ).catch(() => null)
}

// modules/store_blog — Store_builder_api::blog_post(), not store_blog's own
// Store_blog_api. That controller resolves tenant via subdomain/CORS and
// nothing here calls it that way; every other tenant-scoped fetch in this
// file goes through the tenantId-param admin API instead, so the blog page
// follows suit rather than adding a second fetch pattern.
export interface BlogPost {
  id: number
  title: string
  slug: string
  body: string
  excerpt: string | null
  featured_image: string | null
  published_at: string | null
  updated_at: string | null
  author: string
  categories: { name: string; slug: string }[]
  seo: {
    title: string
    meta_description: string
    og_image: string | null
  }
}

export async function fetchBlogPost(
  stratumUrl: string,
  tenantId: number,
  slug: string
): Promise<BlogPost | null> {
  return $fetch<{ data: BlogPost }>(
    `${stratumUrl}/admin/store_builder_api/blog_post`,
    { query: { tenantId, slug } }
  ).then(r => r.data).catch(() => null)
}

// List counterpart to fetchBlogPost -- powers BlogPostList.vue's "Auto" mode.
export interface BlogPostSummary {
  id: number
  title: string
  slug: string
  url: string
  excerpt: string | null
  featured_image: string | null
  published_at: string | null
  author: string
  categories: { name: string; slug: string }[]
}

export async function fetchBlogPosts(
  stratumUrl: string,
  tenantId: number,
  limit?: number
): Promise<BlogPostSummary[]> {
  return $fetch<{ data: BlogPostSummary[] }>(
    `${stratumUrl}/admin/store_builder_api/blog_posts`,
    { query: { tenantId, limit } }
  ).then(r => r.data).catch(() => [])
}

// ── Shipping checkout (modules/logistic/controllers/Shipping_checkout.php) ──
// Provider-agnostic rate quoting -- normalized shape regardless of whether
// the store's active provider (Shipping_provider_factory) is The Courier
// Guy, Bob Go, or the WooCommerce-native zone fallback. Public route at the
// bare Stratum host (not under /admin/), same host as everything else above.
export interface ShippingCheckoutRate {
  provider:        string
  service_code:    string
  service_name:    string
  price:           number
  currency:        string
  eta_days:        number | null
  is_pickup_point: boolean
  courier_name:    string | null
  // Only meaningful when provider === 'woocommerce_native' -- lets the
  // storefront also apply the same choice to the shopper's real WC cart via
  // the existing shipping-rate.post.ts, so WC's own order totals stay
  // correct without any extra order-attach step. External providers have no
  // WC package/rate to select against.
  package_id?:     number
}

export interface ShippingCheckoutRatesResponse {
  rates:          ShippingCheckoutRate[]
  error:          string | null
  session_token:  string
}

export async function selectShippingCheckoutRate(
  stratumUrl:   string,
  storeId:      number,
  sessionToken: string,
  rate:         ShippingCheckoutRate,
  tenantId:     number
): Promise<{ success: boolean; rate: ShippingCheckoutRate; session_token: string }> {
  return $fetch(`${stratumUrl}/shipping_checkout/select_rate`, {
    method: 'POST',
    body: { store_id: storeId, tenant_id: tenantId, session_token: sessionToken, rate },
  })
}

export async function fetchSelectedShippingCheckoutRate(
  stratumUrl:   string,
  storeId:      number,
  sessionToken: string,
  tenantId:     number
): Promise<{ rate: ShippingCheckoutRate | null; session_token: string }> {
  return $fetch(`${stratumUrl}/shipping_checkout/selected_rate`, {
    query: { store_id: storeId, tenant_id: tenantId, session_token: sessionToken },
  })
}
