<script setup lang="ts">
import type { PublishedCollectionSummary } from '~/server/utils/stratum'

// Distinct from CollectionCarousel.vue (singular — a carousel of PRODUCTS
// within one merchant-picked collection). This carousel's cards ARE the
// collections themselves — same data source as CollectionList.vue's 'live'
// mode (/api/collections), just in the polished ProductCarousel-style
// scroll-track chrome instead of a plain grid or bare overflow-x 'strip'.
const props = withDefaults(defineProps<{
  headline?: string
  subheadline?: string
  viewAllText?: string
  viewAllUrl?: string
  count?: number
  cardWidth?: number
  showArrows?: boolean
  showDots?: boolean
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  cardRadius?: number
  showPlaceholder?: boolean
}>(), {
  showArrows: true,
  showDots: false,
})

const trackRef = ref<HTMLDivElement | null>(null)
const clamp = computed(() => Math.max(2, Math.min(props.count ?? 8, 20)))

function scroll(dir: 'left' | 'right') {
  if (!trackRef.value) return
  const width = (props.cardWidth || 260) + 16
  trackRef.value.scrollBy({ left: dir === 'right' ? width : -width, behavior: 'smooth' })
}

function hue(index: number) {
  return `hsl(${index * 60}, 25%, 88%)`
}

// useRequestFetch() (not plain $fetch) so this internal SSR call carries the
// original request's Host header -- see pages/product/[slug].vue for why.
const requestFetch = useRequestFetch()

const { data: collections, pending } = await useAsyncData<PublishedCollectionSummary[]>(
  'carousel-collections',
  () => requestFetch('/api/collections'),
  { default: () => [] as PublishedCollectionSummary[] }
)

const showCarousel = computed(() =>
  !pending.value && (collections.value?.length ?? 0) > 0
)
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '56px 0' }">
    <div style="max-width:1280px;margin:0 auto;padding:0 24px;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;">
        <div>
          <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '28px', fontWeight: 800, margin: '0 0 6px' }">{{ headline }}</h2>
          <p v-if="subheadline" :style="{ color: textColor || '#1e293b', opacity: 0.6, fontSize: '15px', margin: 0 }">{{ subheadline }}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <a v-if="viewAllText" :href="viewAllUrl || '/collections'" :style="{ color: accentColor || '#2563eb', fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }">
            {{ viewAllText }} →
          </a>
          <div v-if="showArrows" style="display:flex;gap:6px;margin-left:12px;">
            <button
              v-for="dir in (['left','right'] as const)" :key="dir"
              @click="scroll(dir)"
              :style="{ width:'36px', height:'36px', borderRadius:'50%', border:`1.5px solid ${(textColor||'#1e293b')}22`, backgroundColor:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: textColor||'#1e293b', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }"
              :aria-label="dir === 'left' ? 'Scroll left' : 'Scroll right'"
            >{{ dir === 'left' ? '‹' : '›' }}</button>
          </div>
        </div>
      </div>
    </div>
    <div style="padding-left:24px;overflow-x:auto;">
      <div ref="trackRef" style="display:flex;gap:16px;padding-right:24px;padding-bottom:4px;">
        <!-- Loading skeleton -->
        <template v-if="pending">
          <div v-for="i in clamp" :key="i"
            :style="{ width: `${cardWidth || 260}px`, flexShrink: 0, borderRadius: `${cardRadius || 12}px`, aspectRatio: '4/3', background: '#e2e8f0', animation: 'pulse 1.5s ease-in-out infinite' }" />
        </template>

        <!-- Real, published collections -->
        <template v-else-if="showCarousel">
          <component
            :is="c.pageSlug ? 'a' : 'div'"
            v-for="(c, i) in collections.slice(0, clamp)"
            :key="c.id"
            :href="c.pageSlug ? `/${c.pageSlug}` : undefined"
            :style="{ width: `${cardWidth || 260}px`, flexShrink: 0, textDecoration: 'none', cursor: c.pageSlug ? 'pointer' : 'default' }"
          >
            <div :style="{ borderRadius: `${cardRadius || 12}px`, overflow: 'hidden', position: 'relative', width: `${cardWidth || 260}px`, aspectRatio: '4/3', backgroundColor: hue(i), display: 'flex', alignItems: 'center', justifyContent: 'center' }">
              <img v-if="c.imageUrl" :src="c.imageUrl" :alt="c.name" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" />
              <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.4);padding:10px 12px;text-align:center;">
                <span style="color:#fff;font-weight:700;font-size:16px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ c.name }}</span>
                <span style="color:rgba(255,255,255,0.85);font-size:12px;">
                  {{ c.itemCount }} item{{ c.itemCount === 1 ? '' : 's' }}{{ !c.pageSlug ? ' · not yet published' : '' }}
                </span>
              </div>
            </div>
          </component>
        </template>

        <!-- Placeholder fallback (no published collections yet) -->
        <template v-else-if="showPlaceholder !== false">
          <div v-for="i in clamp" :key="i"
            :style="{ width: `${cardWidth || 260}px`, flexShrink: 0 }">
            <div :style="{ borderRadius: `${cardRadius || 12}px`, overflow: 'hidden', position: 'relative', width: `${cardWidth || 260}px`, aspectRatio: '4/3', backgroundColor: hue(i), display: 'flex', alignItems: 'center', justifyContent: 'center' }">
              <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.4);padding:10px 12px;text-align:center;">
                <span style="color:#fff;font-weight:700;font-size:16px;">Collection Name</span>
              </div>
            </div>
          </div>
        </template>

        <div v-else style="padding:32px;color:#a0aec0;font-size:14px;">No collections published yet.</div>
      </div>
      <div v-if="showDots" style="display:flex;justify-content:center;gap:6px;margin-top:20px;">
        <span v-for="i in clamp" :key="i" :style="{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor: i === 1 ? (accentColor||'#2563eb') : `${(textColor||'#1e293b')}33` }" />
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
</style>
