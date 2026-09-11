<script setup lang="ts">
// Store Theme Manager "View Demo" — renders a theme's own slot content
// directly (via Store_builder_api::preview_page(), bypassing sb_tenant_pages/
// any real tenant page entirely), served from a real tenant's live domain so
// dynamic blocks (ProductGrid, CollectionList, ...) still resolve against a
// real WooCommerce catalog. Deliberately NOT used for the "product"/
// "blog_post" slot types -- those render through the real /product/[slug] and
// /blog/[slug] routes instead (?previewTheme= override), since the Puck
// blocks assigned to those slots (ProductDetail.vue/BlogPostDetail.vue) read
// route.params.slug directly and have no meaning without a real item's own
// URL. See ThemePreviewBar.vue for how the nav between all of these stays
// consistent.
import { fetchPreviewPage, fetchThemeCss, type PreviewPageData, type ThemeCss } from '~/server/utils/stratum'
import type { WcProduct } from '~/server/utils/woocommerce'

const route  = useRoute()
const config = useRuntimeConfig()

const themeId  = computed(() => Number(route.params.themeId) || 0)
const pageType = computed(() => (route.query.page as string) || 'home')

if (!themeId.value) {
  throw createError({ statusCode: 404, statusMessage: 'Theme not found' })
}

const { data: page, error } = await useAsyncData<PreviewPageData | null>(
  `preview-page-${themeId.value}`,
  () => fetchPreviewPage(config.stratumInternalUrl, themeId.value, pageType.value),
  { server: true, watch: [pageType] }
)

// A genuine 404 here means the themeId itself doesn't resolve to a real,
// published theme at all (fetchPreviewPage's own .catch(() => null)) -- a
// slot that simply has no template assigned still returns page.value with
// success:false + a real slots list, handled in the template below, not here.
if (error.value || !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Theme not found or not published' })
}

const { data: themeCss } = await useAsyncData<ThemeCss | null>(
  `preview-css-${themeId.value}`,
  () => fetchThemeCss(config.stratumInternalUrl, { themeId: themeId.value }),
  { server: true }
)

// Real demo item slugs for the Product/Blog Post nav entries -- see
// ThemePreviewBar.vue. useRequestFetch() (not plain $fetch): these are
// server-side calls to this same app's own /api/**, which needs the
// original request's Host header to resolve the tenant (server/middleware/
// tenant.ts) -- same requirement ProductDetail.vue documents for itself.
const requestFetch = useRequestFetch()

const { data: demoProduct } = await useAsyncData<WcProduct[]>(
  'preview-demo-product',
  () => requestFetch('/api/products', { query: { per_page: 1 } }),
  { server: true }
)
const demoProductSlug = computed(() => demoProduct.value?.[0]?.slug ?? null)

const { data: demoBlogPosts } = await useAsyncData<{ slug: string }[]>(
  'preview-demo-blog',
  () => requestFetch('/api/blog', { query: { limit: 1 } }).catch(() => []),
  { server: true }
)
const demoBlogSlug = computed(() => demoBlogPosts.value?.[0]?.slug ?? null)

useHead(() => ({
  title: `${page.value?.themeName ?? 'Theme'} — Preview`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  link: themeCss.value?.google_fonts_url ? [{ rel: 'stylesheet', href: themeCss.value.google_fonts_url }] : [],
  style: themeCss.value?.css ? [{ innerHTML: themeCss.value.css, key: 'sb-theme-tokens' }] : [],
}))
</script>

<template>
  <div v-if="page">
    <ThemePreviewBar
      :theme-id="themeId"
      :theme-name="page.themeName"
      :slots="page.slots"
      :current-page-type="pageType"
      :demo-product-slug="demoProductSlug"
      :demo-blog-slug="demoBlogSlug"
    />
    <StorefrontRenderer v-if="page.success" :puck-json="page.puckJson" />
    <div v-else class="sb-preview-empty">
      <p>No page has been assigned to the "{{ pageType }}" slot for this theme yet.</p>
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
