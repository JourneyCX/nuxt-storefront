<script setup lang="ts">
import { fetchPublishedPage } from '~/server/utils/stratum'

// tenantId is populated by the server middleware (event.context.tenantId).
// useRequestEvent() returns the H3 event during SSR and null on the client;
// the factory runs once on the server and the value is serialised into the
// payload, so client-side hydration picks it up without calling it again.
const tenantId = useState<number>('sb_tenantId', () => {
  const ev = useRequestEvent()
  return (ev?.context?.tenantId as number) ?? 0
})

const config = useRuntimeConfig()
const route  = useRoute()

const slug = computed(() =>
  Array.isArray(route.params.slug)
    ? route.params.slug.join('/') || 'home'
    : route.params.slug || 'home'
)

if (!tenantId.value) {
  throw createError({ statusCode: 404, statusMessage: 'Store not found' })
}

// Fetch the published Puck layout from Stratum (server-side only; client uses
// the cached payload from the initial SSR response).
const { data: page, error } = await useAsyncData(
  `page-${tenantId.value}-${slug.value}`,
  () => fetchPublishedPage(config.stratumInternalUrl, tenantId.value, slug.value),
  { server: true }
)

if (error.value || !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const puckJson = page.value.puckJson
</script>

<template>
  <StorefrontRenderer :puck-json="puckJson" />
</template>
