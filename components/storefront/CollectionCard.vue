<script setup lang="ts">
import type { PublishedCollectionDetail } from '~/server/utils/stratum'

// One live collection as a single image card -- matches studio-app's
// CollectionCard.tsx. Same endpoint and theme-scope rule as CollectionDetail.vue
// (a collection linked to a DIFFERENT theme 404s, so the card shows nothing).
const props = withDefaults(defineProps<{
  collectionSlug?: string
  height?: number
  showItemCount?: 'yes' | 'no'
}>(), {})

// useRequestFetch() so the SSR call carries the original Host header.
const requestFetch = useRequestFetch()
const { previewTheme } = usePreviewThemeQuery()

const { data } = await useAsyncData<{ collection: PublishedCollectionDetail } | null>(
  `collection-card-${props.collectionSlug}`,
  () => props.collectionSlug
    ? requestFetch(`/api/collections/${props.collectionSlug}`, { query: { previewTheme: previewTheme.value ?? undefined } }).catch(() => null)
    : Promise.resolve(null),
  { default: () => null, watch: [() => props.collectionSlug] }
)

const count = computed(() => data.value?.collection.productIds?.length ?? 0)
const href = computed(() => data.value?.collection.pageSlug ? `/${data.value.collection.pageSlug}` : undefined)
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    v-if="data?.collection"
    :href="href"
    :style="{ display: 'block', textDecoration: 'none' }"
  >
    <div :style="{ borderRadius: '8px', overflow: 'hidden', position: 'relative', height: `${height || 280}px`, background: 'hsl(0, 25%, 88%)', display: 'flex', alignItems: 'flex-end' }">
      <img
        v-if="data.collection.imageUrl"
        :src="data.collection.imageUrl"
        :alt="data.collection.name"
        :style="{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: '0' }"
      />
      <div :style="{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.35)', width: '100%', textAlign: 'center', padding: '10px 0' }">
        <span :style="{ color: '#fff', fontWeight: 700, fontSize: '18px', display: 'block' }">{{ data.collection.name }}</span>
        <span v-if="showItemCount !== 'no'" :style="{ color: 'rgba(255,255,255,0.85)', fontSize: '12.5px' }">
          {{ count }} item{{ count === 1 ? '' : 's' }}
        </span>
      </div>
    </div>
  </component>
</template>
