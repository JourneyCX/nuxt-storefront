<script setup lang="ts">
// Renders the tenant's theme-driven "product" template (via StorefrontRenderer
// + storefront/ProductDetail.vue, which reads the real product from this same
// route's slug) when one is configured, falling back to the standard,
// unchanged DefaultProductDetail.vue otherwise. v-if means only one of the two
// ever actually runs its own data-fetching script setup — not both.
import { fetchPublishedPage } from '~/server/utils/stratum'

const tenantId = useState<number>('sb_tenantId', () => {
  const ev = useRequestEvent()
  return (ev?.context?.tenantId as number) ?? 0
})

const config = useRuntimeConfig()

const { data: themedPage } = await useAsyncData(
  `product-theme-${tenantId.value}`,
  () => fetchPublishedPage(config.stratumInternalUrl, tenantId.value, 'product'),
  { server: true }
)
</script>

<template>
  <StorefrontRenderer v-if="themedPage" :puck-json="themedPage.puckJson" />
  <DefaultProductDetail v-else />
</template>
