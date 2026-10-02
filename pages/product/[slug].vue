<script setup lang="ts">
// Renders the tenant's theme-driven "product" template (via StorefrontRenderer
// + storefront/ProductDetail.vue, which reads the real product from this same
// route's slug) when one is configured, falling back to the standard,
// unchanged DefaultProductDetail.vue otherwise. v-if means only one of the two
// ever actually runs its own data-fetching script setup — not both.
//
// ?previewTheme=X (Store Theme Manager "View Demo"): renders a SPECIFIC
// theme's "product" slot instead of whatever theme this tenant actually has
// applied — this route (not the dedicated /preview/[themeId] route) is used
// for product-type previews specifically because ProductDetail.vue reads the
// real product straight from THIS route's own slug param; there is no
// meaningful "preview a product page" without a real product's URL to render
// it against. See ThemePreviewBar.vue for the shared preview nav.
import type { PuckPageData, PreviewPageData, ThemeCss } from '~/server/utils/stratum'
import type { WcProduct } from '~/server/utils/woocommerce'

const tenantId = useState<number>('sb_tenantId', () => {
  const ev = useRequestEvent()
  return (ev?.context?.tenantId as number) ?? 0
})

const route  = useRoute()
// Same-origin fetch to this app's own /api/** -- NOT a direct call to
// config.stratumInternalUrl from this page component. See
// server/api/preview/page.get.ts's comment: that value is server-only and
// resolves to undefined the moment page-component code calling it runs
// client-side instead of during SSR (confirmed live 2026-09-23 for the
// theme-preview route; the same direct-import pattern existed here too).
const requestFetch = useRequestFetch()

// ?previewTheme= carries EITHER a theme's numeric id (older/internal links)
// OR its public slug (links built from the public "/themes" gallery, or
// forwarded here by ThemePreviewBar from a slug-addressed /preview/{slug}
// session) -- same dual-identifier contract as pages/preview/[theme].vue.
const previewThemeRaw  = computed(() => (route.query.previewTheme as string) || '')
const previewThemeIsOn = computed(() => !!previewThemeRaw.value)
const previewThemeId   = computed(() => (/^\d+$/.test(previewThemeRaw.value) ? Number(previewThemeRaw.value) : 0))
const previewThemeRef  = computed(() => (previewThemeId.value ? { themeId: previewThemeId.value } : { slug: previewThemeRaw.value }))

const { data: normalPage } = await useAsyncData<PuckPageData | null>(
  `product-theme-${tenantId.value}`,
  () => previewThemeIsOn.value ? Promise.resolve(null) : requestFetch('/api/published-page', { query: { tenantId: tenantId.value, slug: 'product' } }).catch(() => null),
  { server: true }
)

// Category-specific override (see Store_builder::category_templates()) --
// fetched here, separately from storefront/ProductDetail.vue's own self-fetch
// by the same slug, specifically so the category ids are known BEFORE
// deciding which puckJson to render below. A second small request for the
// same product is an accepted tradeoff over threading product data down
// through StorefrontRenderer's props, which every other self-fetching widget
// (ProductGrid, this page's own ProductDetail) deliberately doesn't do.
const slug = route.params.slug as string
const { data: productForCategory } = await useAsyncData<WcProduct | null>(
  `product-category-lookup-${slug}`,
  () => (!previewThemeIsOn.value && slug) ? requestFetch(`/api/products/${slug}`).catch(() => null) : Promise.resolve(null),
  { server: true }
)

const { data: categoryPage } = await useAsyncData<PuckPageData | null>(
  `product-category-theme-${tenantId.value}-${slug}`,
  () => {
    const categoryIds = productForCategory.value?.categories?.map(c => c.id) ?? []
    return categoryIds.length
      ? requestFetch('/api/category-product-template', { query: { tenantId: tenantId.value, categoryIds: categoryIds.join(',') } }).catch(() => null)
      : Promise.resolve(null)
  },
  { server: true }
)

const { data: previewData } = await useAsyncData<PreviewPageData | null>(
  `product-preview-${previewThemeRaw.value}`,
  () => previewThemeIsOn.value ? requestFetch('/api/preview/page', { query: { ...previewThemeRef.value, pageType: 'product' } }).catch(() => null) : Promise.resolve(null),
  { server: true }
)

const { data: themeCss } = await useAsyncData<ThemeCss | null>(
  `product-preview-css-${previewThemeRaw.value}`,
  () => previewThemeIsOn.value ? requestFetch('/api/preview/css', { query: { ...previewThemeRef.value } }).catch(() => null) : Promise.resolve(null),
  { server: true }
)

useHead(() => ({
  link: themeCss.value?.google_fonts_url ? [{ rel: 'stylesheet', href: themeCss.value.google_fonts_url }] : [],
  style: themeCss.value?.css ? [{ innerHTML: themeCss.value.css, key: 'sb-theme-tokens' }] : [],
  meta: previewThemeIsOn.value ? [{ name: 'robots', content: 'noindex, nofollow' }] : [],
}))

const puckJson = computed(() => {
  if (previewThemeIsOn.value) {
    return previewData.value?.success ? previewData.value.puckJson : null
  }
  // Category override wins when set; otherwise the theme's single, catalog-
  // wide "product" template (unchanged behaviour for every tenant not using
  // Category Templates).
  return categoryPage.value?.puckJson ?? normalPage.value?.puckJson ?? null
})
</script>

<template>
  <div>
    <ThemePreviewBar
      v-if="previewThemeIsOn && previewData"
      :theme-id="previewThemeId"
      :theme-slug="previewData.themeSlug"
      :theme-name="previewData.themeName"
      :slots="previewData.slots"
      current-page-type="product"
      :demo-product-slug="(route.params.slug as string)"
    />
    <StorefrontRenderer v-if="puckJson" :puck-json="puckJson" />
    <DefaultProductDetail v-else-if="!previewThemeIsOn" />
    <div v-else class="sb-preview-empty">
      <p>No page has been assigned to the "product" slot for this theme yet.</p>
    </div>
  </div>
</template>

<style scoped>
.sb-preview-empty {
  padding: 80px 24px;
  text-align: center;
  color: #6b7280;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
