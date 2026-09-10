<script setup lang="ts">
// Renders the tenant's theme-driven "blog_post" template (via
// StorefrontRenderer + storefront/BlogPostDetail.vue, which reads the real
// post from this same route's slug) when one is configured, falling back to
// the standard, unchanged DefaultBlogPostDetail.vue otherwise. v-if means
// only one of the two ever actually runs its own data-fetching script setup —
// not both.
import { fetchPublishedPage } from '~/server/utils/stratum'

const tenantId = useState<number>('sb_tenantId', () => {
  const ev = useRequestEvent()
  return (ev?.context?.tenantId as number) ?? 0
})

const config = useRuntimeConfig()

const { data: themedPage } = await useAsyncData(
  `blog-post-theme-${tenantId.value}`,
  () => fetchPublishedPage(config.stratumInternalUrl, tenantId.value, 'blog_post'),
  { server: true }
)
</script>

<template>
  <StorefrontRenderer v-if="themedPage" :puck-json="themedPage.puckJson" />
  <DefaultBlogPostDetail v-else />
</template>
