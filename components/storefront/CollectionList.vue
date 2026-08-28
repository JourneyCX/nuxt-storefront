<script setup lang="ts">
defineProps<{
  headline?: string
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
      </div>
    </div>
  </section>
</template>
