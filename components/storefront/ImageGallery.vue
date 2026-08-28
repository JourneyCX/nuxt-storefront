<script setup lang="ts">
type GalleryImage = { src: string; alt: string; caption: string }
defineProps<{
  headline?: string
  // Accepted for schema parity with studio-app's ImageGallery.tsx and stored puck_json —
  // not yet wired to an actual masonry layout; always renders as a uniform grid.
  layout?: 'grid' | 'masonry'
  columns?: 2 | 3 | 4
  gap?: number
  imageAspectRatio?: string
  borderRadius?: number
  showCaptions?: boolean
  backgroundColor?: string
  textColor?: string
  images?: GalleryImage[]
}>()
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div style="max-width:1280px;margin:0 auto;">
      <!-- sb-text-fluid-md (assets/css/responsive.css) scales this down on
           narrow screens instead of staying fixed at 32px. -->
      <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color: textColor || '#1e293b', fontWeight: 800, margin: '0 0 36px' }">{{ headline }}</h2>
      <!-- sb-grid collapses this to 1 column on mobile / 2 on tablet regardless of the merchant's chosen column count -->
      <div class="sb-grid" :style="{ display: 'grid', gridTemplateColumns: `repeat(${columns || 3}, 1fr)`, gap: `${gap ?? 12}px` }">
        <div v-for="(img, i) in (images?.length ? images : Array.from({length:6}, (_,i) => ({src:'',alt:`Photo ${i+1}`,caption:''})))" :key="i">
          <div :style="{ borderRadius: `${borderRadius ?? 10}px`, overflow: 'hidden', aspectRatio: imageAspectRatio || '1/1', backgroundColor: '#e2e8f0' }">
            <img v-if="img.src" :src="img.src" :alt="img.alt" :style="{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }" />
            <div v-else :style="{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }">
              📷 {{ img.alt }}
            </div>
          </div>
          <p v-if="showCaptions && img.caption" :style="{ color: textColor || '#1e293b', opacity: 0.6, fontSize: '13px', textAlign: 'center', margin: '8px 0 0' }">{{ img.caption }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
