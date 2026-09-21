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
  // top-level entry with no children renders as a plain link. url is absent
  // (not empty-string) for a menu_group page — a dropdown-only label with no
  // link of its own; SiteHeader.vue renders a <span>, not an <a>, for that
  // case. Kept in sync with studio-app's siteSettings.ts.
  navLinks: { label: string; url?: string; children?: { label: string; url?: string }[] }[]
  headerBackgroundColor: string | null
  headerTextColor: string | null
  headerAccentColor: string | null
  headerSticky: boolean
  headerCtaText: string | null
  headerCtaUrl: string | null
  // CSS font-family value (e.g. "'Poppins', sans-serif"), applied to the whole
  // main menu — top-level links and dropdown children, desktop and mobile.
  // null = renderer's own default (Montserrat, matching the pre-existing
  // hardcoded value). Kept in sync with studio-app's FontsSection.tsx FONT_OPTIONS.
  headerNavFontFamily: string | null
  headerNavFontSize: number
  // Which side of the header the logo sits on. 'logo-left' (default) matches every
  // existing tenant's current rendering unchanged. Kept in sync with studio-app's
  // siteSettings.ts.
  headerMenuPosition: 'logo-left' | 'nav-left'
  // Horizontal gap (px) between top-level Main Menu items, desktop only. Default 28
  // matches what SiteHeader.vue's `nav { gap: 28px }` had hardcoded before this
  // setting existed. Kept in sync with studio-app's siteSettings.ts.
  headerNavItemSpacing: number
  footerBackgroundColor: string | null
  footerTextColor: string | null
  footerAccentColor: string | null
  footerCopyrightText: string | null
  footerColumns: { heading: string; links: { label: string; url: string }[] }[]
  footerShowBrandColumn: boolean
  // Same convention, applied to the footer's column link lists ("footer menus").
  footerNavFontFamily: string | null
  footerNavFontSize: number
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
  announcementShowCountdown: boolean
  announcementCountdownEnd: string | null
  announcementFontSize: number
  announcementCountdownFontSize: number
  announcementCountdownBold: boolean
  // Floating "Shop Assistant" chat bubble — site-wide chrome fixed to the bottom of
  // every screen. Kept in sync with studio-app's siteSettings.ts. aiBubbleProxyEndpoint/
  // aiBubbleApiKey are resolved and persisted server-side (Store_builder_api::
  // update_site_settings()) the moment this section is first saved in Studio — never
  // set from either frontend.
  aiBubbleEnabled: boolean
  aiBubblePosition: 'bottom-right' | 'bottom-left'
  aiBubbleAssistantName: string | null
  aiBubbleGreeting: string | null
  aiBubbleStarterPrompts: string | null
  aiBubbleAccentColor: string | null
  aiBubbleSystemPrompt: string | null
  aiBubbleProxyEndpoint: string | null
  aiBubbleApiKey: string | null
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

// Manually-curated, cross-category product groupings — see
// Store_builder_api::published_collections()/published_collection() (bare,
// unauthenticated, published-only — same auth shape as fetchPublishedPage
// above). image/count are CI3-native (no WC call needed for the list);
// productIds on the detail shape are resolved into full WcProduct data by
// the caller (server/api/collections/[slug].get.ts), same split as every
// other CI3-vs-WC data source in this file.
export interface PublishedCollectionSummary {
  id: number
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  pageSlug: string | null
  itemCount: number
}

export interface PublishedCollectionDetail {
  id: number
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  pageSlug: string | null
  productIds: number[]
}

export async function fetchPublishedCollections(
  stratumUrl: string,
  tenantId: number
): Promise<PublishedCollectionSummary[]> {
  const data = await $fetch<{ collections: Array<{ id: number; name: string; slug: string; description: string | null; image_url: string | null; page_slug: string | null; item_count: number }> }>(
    `${stratumUrl}/admin/store_builder_api/published_collections`,
    { query: { tenantId } }
  ).catch(() => null)
  return (data?.collections ?? []).map(c => ({
    id: c.id, name: c.name, slug: c.slug, description: c.description,
    imageUrl: c.image_url, pageSlug: c.page_slug, itemCount: c.item_count,
  }))
}

export async function fetchPublishedCollection(
  stratumUrl: string,
  tenantId: number,
  slug: string
): Promise<PublishedCollectionDetail | null> {
  const data = await $fetch<{ collection: { id: number; name: string; slug: string; description: string | null; image_url: string | null; page_slug: string | null; product_ids: number[] } }>(
    `${stratumUrl}/admin/store_builder_api/published_collection`,
    { query: { tenantId, slug } }
  ).catch(() => null)
  if (!data?.collection) return null
  const c = data.collection
  return {
    id: c.id, name: c.name, slug: c.slug, description: c.description,
    imageUrl: c.image_url, pageSlug: c.page_slug, productIds: c.product_ids ?? [],
  }
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
  opts: { tenantId?: number; themeId?: number; slug?: string }
): Promise<ThemeCss | null> {
  const query = opts.themeId
    ? { themeId: opts.themeId }
    : opts.slug
      ? { slug: opts.slug }
      : { tenantId: opts.tenantId }
  return $fetch<ThemeCss>(
    `${stratumUrl}/admin/store_builder_api/theme_css`,
    { query }
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
// $fetch throwing it away on a 404. themeSlug is echoed back regardless of
// whether the request was addressed by id or slug, so callers can always
// build further nav links off the theme's own public slug.
export type PreviewPageData =
  | { success: true; themeName: string; themeSlug: string; pageType: string; pageName: string; puckJson: Record<string, unknown>; slots: PreviewSlot[] }
  | { success: false; reason: string; themeName: string; themeSlug: string; pageType: string; slots: PreviewSlot[] }

// Identify the theme either by its numeric id (internal nav, e.g. the
// ?previewTheme= override on /product and /blog) or by its public slug (the
// /preview/[theme] route, reachable from the public "/themes" gallery).
export async function fetchPreviewPage(
  stratumUrl: string,
  theme: { themeId?: number; slug?: string },
  pageType: string
): Promise<PreviewPageData | null> {
  const query = theme.themeId ? { themeId: theme.themeId, pageType } : { slug: theme.slug, pageType }
  return $fetch<PreviewPageData>(
    `${stratumUrl}/admin/store_builder_api/preview_page`,
    { query }
  ).catch(() => null)
}

export interface PublishedThemeSummary {
  id: number
  name: string
  slug: string
  category: string
  categoryName: string
  description: string | null
  previewImage: string | null
  tags: string[]
}

// Public theme-gallery listing — backs the "/themes" storefront page.
// Store_builder_api::published_themes() is a bare, unauthenticated
// controller, same as theme_css()/preview_page() above.
export async function fetchPublishedThemes(stratumUrl: string): Promise<PublishedThemeSummary[]> {
  const data = await $fetch<{ themes: PublishedThemeSummary[] }>(
    `${stratumUrl}/admin/store_builder_api/published_themes`
  ).catch(() => null)
  return data?.themes ?? []
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
