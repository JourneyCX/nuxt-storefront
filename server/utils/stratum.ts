// Server-side helpers for calling the Stratum internal API.
// These run only in the Nuxt server runtime — credentials never reach the browser.

export interface PuckPageData {
  puckJson: Record<string, unknown>
}

export interface WooCredentials {
  url: string
  key: string
  secret: string
  // The Laravel Tenant primary key (== the CI3 company slug, e.g. "colby") —
  // added for the Supplier Network checkout integration, which needs to
  // address Laravel's per-tenant reservation API. Not the same as this app's
  // own numeric tenantId; Laravel has no concept of that id at all. Nullable:
  // a tenant with WC credentials but no matching companies row (shouldn't
  // happen in practice, but the CI3 endpoint returns null rather than erroring)
  // simply can't use Supplier Network checkout — every other field here is
  // unaffected either way.
  slug: string | null
}

// Single source of truth for Header/Footer chrome + site-wide branding — see
// docs/site_settings_architecture_investigation.md. One row per tenant, fetched in
// parallel with the page JSON (both only need tenantId, so there's no serial
// dependency) and cached under the same ISR boundary as the page itself.
export interface SiteSettings {
  logoUrl: string | null
  logoAlt: string | null
  logoText: string | null
  // Rendered logo height in px, sized independently for header vs. footer.
  headerLogoHeight: number
  footerLogoHeight: number
  // On/off for the logo image specifically inside the footer's brand block —
  // distinct from footerShowBrandColumn below, which gates the whole block.
  footerShowLogo: boolean
  faviconUrl: string | null
  businessName: string | null
  tagline: string | null
  description: string | null
  // Not rendered by this phase — kept in sync with studio-app's SiteSettings type
  // per this file's own convention. Consumed server-side by the Storefront AI
  // Assistant chat endpoint on the Stratum backend, not by the storefront itself.
  shippingReturnsPolicy: string | null
  contactPhone: string | null
  contactEmail: string | null
  contactAddress: string | null
  socialLinks: { platform: string; url: string }[]
  // children = one level of dropdown nesting, derived server-side from the
  // Pages panel's menu tree (Store_builder_model::build_nav_links()) — a
  // top-level entry with no children renders as a plain link. Kept in sync
  // with studio-app's siteSettings.ts.
  navLinks: { label: string; url: string; children?: { label: string; url: string }[] }[]
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
  announcementEnabled: boolean
  announcementMessage: string | null
  announcementMode: 'static' | 'scroll'
  announcementBgColor: string | null
  announcementTextColor: string | null
  announcementLinkUrl: string | null
  announcementSpeed: number
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

// Store Theme Manager's style tokens (primary/secondary color, fonts, border
// radius, button style), compiled server-side into a :root{...} custom-
// property CSS block by the same code the admin Theme Styles editor uses.
// Pass tenantId for "this tenant's currently applied theme" (the normal
// storefront case) or themeId directly for a specific theme regardless of
// any tenant (theme preview mode) — see Store_builder_api::theme_css().
export interface ThemeCss {
  css: string | null
  google_fonts_url: string | null
  fonts: string[]
}

export async function fetchThemeCss(
  stratumUrl: string,
  opts: { tenantId?: number; themeId?: number }
): Promise<ThemeCss | null> {
  return $fetch<ThemeCss>(
    `${stratumUrl}/admin/store_builder_api/theme_css`,
    { query: opts.themeId ? { themeId: opts.themeId } : { tenantId: opts.tenantId } }
  ).catch(() => null)
}

// Theme preview mode's page-content source — a theme SLOT's own template
// content by page type, independent of any real tenant page. See
// Store_builder_api::preview_page().
export interface PreviewSlot {
  pageType: string
  label: string
  available: boolean
}

// success:true carries real puckJson to render. success:false still carries
// themeName/slots (so the preview nav can render) but no puckJson — this
// specific slot just has no template assigned yet. Always HTTP 200 (see the
// PHP endpoint's own comment) specifically so this shape survives instead of
// $fetch throwing it away on a 404.
export type PreviewPageData =
  | { success: true; themeName: string; pageType: string; pageName: string; puckJson: Record<string, unknown>; slots: PreviewSlot[] }
  | { success: false; reason: string; themeName: string; pageType: string; slots: PreviewSlot[] }

export async function fetchPreviewPage(
  stratumUrl: string,
  themeId: number,
  pageType: string
): Promise<PreviewPageData | null> {
  return $fetch<PreviewPageData>(
    `${stratumUrl}/admin/store_builder_api/preview_page`,
    { query: { themeId, pageType } }
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
