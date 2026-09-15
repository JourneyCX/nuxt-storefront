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
import { fetchPublishedPage, fetchPreviewPage, fetchThemeCss, type PuckPageData, type PreviewPageData, type ThemeCss } from '~/server/utils/stratum'

const tenantId = useState<number>('sb_tenantId', () => {
  const ev = useRequestEvent()
  return (ev?.context?.tenantId as number) ?? 0
})

const config = useRuntimeConfig()
const route  = useRoute()

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
  () => previewThemeIsOn.value ? Promise.resolve(null) : fetchPublishedPage(config.stratumInternalUrl, tenantId.value, 'product'),
  { server: true }
)

const { data: previewData } = await useAsyncData<PreviewPageData | null>(
  `product-preview-${previewThemeRaw.value}`,
  () => previewThemeIsOn.value ? fetchPreviewPage(config.stratumInternalUrl, previewThemeRef.value, 'product') : Promise.resolve(null),
  { server: true }
)

const { data: themeCss } = await useAsyncData<ThemeCss | null>(
  `product-preview-css-${previewThemeRaw.value}`,
  () => previewThemeIsOn.value ? fetchThemeCss(config.stratumInternalUrl, previewThemeRef.value) : Promise.resolve(null),
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
  return normalPage.value?.puckJson ?? null
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
