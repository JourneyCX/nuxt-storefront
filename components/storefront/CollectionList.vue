<script setup lang="ts">
import type { PublishedCollectionSummary } from '~/server/utils/stratum'

const props = defineProps<{
  headline?: string
  // 'manual' (default, absent === manual) is the original hand-typed-tiles
  // behaviour, unchanged. 'live' resolves real, published collections from
  // the tenant's own Collections manager instead — added additively so every
  // already-published page using this widget (which has no `mode` key at all
  // in its stored puck_json) keeps rendering exactly as it did before this
  // field existed, matching studio-app's CollectionList.tsx exactly.
  mode?: 'manual' | 'live'
  collections?: Array<{ name: string; imageUrl: string; url: string }>
  columns?: number
  backgroundColor?: string
  // `layout` was part of an earlier schema some live themes were authored against.
  // 'grid' matches the existing (default) CSS-grid rendering; 'strip' is a new
  // horizontally-scrolling row, matching studio-app's CollectionList.tsx.
  layout?: 'grid' | 'strip'
}>()

function hue(index: number) {
  return `hsl(${index * 60}, 25%, 88%)`
}

const isLive = computed(() => (props.mode ?? 'manual') === 'live')

// Theme context forwarded through to /api/collections so a theme-linked
// collection (see the "belongs to a theme" v32 migration) is only shown
// under the theme it's actually linked to. usePreviewThemeQuery() (not a
// bare route.query.previewTheme read) so this also works when rendered
// INSIDE the dedicated /preview/{theme}/{page} route, which carries the
// identifier as a :theme route param, not a query string — see that
// composable's own comment. undefined on the real live storefront, where
// the backend resolves the tenant's own active theme itself.
const { previewTheme } = usePreviewThemeQuery()

// useRequestFetch() (not plain $fetch) so this internal SSR call carries the
// original request's Host header -- see pages/product/[slug].vue for why.
const requestFetch = useRequestFetch()
const { data: liveCollections, pending, error } = await useAsyncData<PublishedCollectionSummary[]>(
  'collection-list',
  () => isLive.value ? requestFetch('/api/collections', { query: { previewTheme: previewTheme.value ?? undefined } }) : Promise.resolve([]),
  { default: () => [], watch: [isLive] }
)
</script>
<template>
  <section :style="{ backgroundColor: backgroundColor || '#ffffff', padding: '48px 24px' }">
    <div :style="{ maxWidth: '1200px', margin: '0 auto' }">
      <h2 v-if="headline" :style="{ margin: '0 0 32px', fontSize: '28px', fontWeight: 700, color: '#1a202c' }">
        {{ headline }}
      </h2>
      <!-- sb-grid (assets/css/responsive.css) collapses the grid variant to 1 column
           on mobile and 2 on tablet regardless of the merchant's chosen column count —
           desktop keeps whatever `columns` picks. Only applied when not the strip
           layout, matching studio-app's CollectionList.tsx. -->
      <div
        :class="layout !== 'strip' ? 'sb-grid' : undefined"
        :style="layout === 'strip'
        ? { display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '4px' }
        : { display: 'grid', gridTemplateColumns: `repeat(${columns || 3}, 1fr)`, gap: '20px' }">
        <!-- Manual mode: original hand-typed tiles, unchanged. -->
        <template v-if="!isLive">
          <a
            v-for="(col, i) in (collections || [])"
            :key="i"
            :href="col.url"
            :style="{ textDecoration: 'none', ...(layout === 'strip' ? { flex: '0 0 220px' } : {}) }"
          >
            <div :style="{ borderRadius: '8px', overflow: 'hidden', position: 'relative', height: '200px', background: hue(i), display: 'flex', alignItems: 'center', justifyContent: 'center' }">
              <img v-if="col.imageUrl" :src="col.imageUrl" :alt="col.name" :style="{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: '0' }" />
              <div :style="{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.35)', width: '100%', textAlign: 'center', padding: '10px 0' }">
                <span :style="{ color: '#fff', fontWeight: 700, fontSize: '18px' }">{{ col.name }}</span>
              </div>
            </div>
          </a>
        </template>
        <!-- Live mode: real, published collections. -->
        <template v-else-if="!pending && !error">
          <component
            :is="c.pageSlug ? 'a' : 'div'"
            v-for="(c, i) in liveCollections"
            :key="c.id"
            :href="c.pageSlug ? `/${c.pageSlug}` : undefined"
            :style="{ textDecoration: 'none', cursor: c.pageSlug ? 'pointer' : 'default', ...(layout === 'strip' ? { flex: '0 0 220px' } : {}) }"
          >
            <div :style="{ borderRadius: '8px', overflow: 'hidden', position: 'relative', height: '200px', background: hue(i), display: 'flex', alignItems: 'center', justifyContent: 'center' }">
              <img v-if="c.imageUrl" :src="c.imageUrl" :alt="c.name" :style="{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: '0' }" />
              <div :style="{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.35)', width: '100%', textAlign: 'center', padding: '10px 0' }">
                <span :style="{ color: '#fff', fontWeight: 700, fontSize: '18px', display: 'block' }">{{ c.name }}</span>
                <span :style="{ color: 'rgba(255,255,255,0.85)', fontSize: '12.5px' }">
                  {{ c.itemCount }} item{{ c.itemCount === 1 ? '' : 's' }}
                </span>
              </div>
            </div>
          </component>
        </template>
      </div>
      <p v-if="isLive && !pending && liveCollections.length === 0" :style="{ color: '#a0aec0', fontSize: '14px', padding: '32px', textAlign: 'center' }">
        No collections published yet.
      </p>
    </div>
  </section>
</template>
