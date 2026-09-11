<script setup lang="ts">
// Renders the tenant's theme-driven "blog_post" template (via
// StorefrontRenderer + storefront/BlogPostDetail.vue, which reads the real
// post from this same route's slug) when one is configured, falling back to
// the standard, unchanged DefaultBlogPostDetail.vue otherwise. v-if means
// only one of the two ever actually runs its own data-fetching script setup —
// not both.
//
// ?previewTheme=X (Store Theme Manager "View Demo") — same override pattern
// as pages/product/[slug].vue; see that file's own comment for why this
// route (not /preview/[themeId]) handles blog_post-type previews.
import { fetchPublishedPage, fetchPreviewPage, fetchThemeCss, type PuckPageData, type PreviewPageData, type ThemeCss } from '~/server/utils/stratum'

const tenantId = useState<number>('sb_tenantId', () => {
  const ev = useRequestEvent()
  return (ev?.context?.tenantId as number) ?? 0
})

const config = useRuntimeConfig()
const route  = useRoute()

const previewThemeId = computed(() => Number(route.query.previewTheme) || 0)

const { data: normalPage } = await useAsyncData<PuckPageData | null>(
  `blog-post-theme-${tenantId.value}`,
  () => previewThemeId.value ? Promise.resolve(null) : fetchPublishedPage(config.stratumInternalUrl, tenantId.value, 'blog_post'),
  { server: true }
)

const { data: previewData } = await useAsyncData<PreviewPageData | null>(
  `blog-post-preview-${previewThemeId.value}`,
  () => previewThemeId.value ? fetchPreviewPage(config.stratumInternalUrl, previewThemeId.value, 'blog_post') : Promise.resolve(null),
  { server: true }
)

const { data: themeCss } = await useAsyncData<ThemeCss | null>(
  `blog-post-preview-css-${previewThemeId.value}`,
  () => previewThemeId.value ? fetchThemeCss(config.stratumInternalUrl, { themeId: previewThemeId.value }) : Promise.resolve(null),
  { server: true }
)

useHead(() => ({
  link: themeCss.value?.google_fonts_url ? [{ rel: 'stylesheet', href: themeCss.value.google_fonts_url }] : [],
  style: themeCss.value?.css ? [{ innerHTML: themeCss.value.css, key: 'sb-theme-tokens' }] : [],
  meta: previewThemeId.value ? [{ name: 'robots', content: 'noindex, nofollow' }] : [],
}))

const puckJson = computed(() => {
  if (previewThemeId.value) {
    return previewData.value?.success ? previewData.value.puckJson : null
  }
  return normalPage.value?.puckJson ?? null
})
</script>

<template>
  <div>
    <ThemePreviewBar
      v-if="previewThemeId && previewData"
      :theme-id="previewThemeId"
      :theme-name="previewData.themeName"
      :slots="previewData.slots"
      current-page-type="blog_post"
      :demo-blog-slug="(route.params.slug as string)"
    />
    <StorefrontRenderer v-if="puckJson" :puck-json="puckJson" />
    <DefaultBlogPostDetail v-else-if="!previewThemeId" />
    <div v-else class="sb-preview-empty">
      <p>No page has been assigned to the "blog_post" slot for this theme yet.</p>
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
