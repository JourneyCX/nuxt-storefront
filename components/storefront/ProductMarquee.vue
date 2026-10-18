<script setup lang="ts">
import type { WcProduct } from '~/server/utils/woocommerce'

// Mirrors studio-app/src/components/Commerce/ProductMarquee.tsx prop-for-prop —
// see that file for the rationale. The repeat count and duration maths below must
// stay identical to it. Pure CSS loop: the track is two identical halves and slides
// by exactly 50%, so it wraps without a visible jump.
//
// NOTE: Vue casts an *absent* Boolean-typed prop to `false`, so the boolean fields
// that default to true are set through withDefaults() (see ProductCarousel.vue).
const props = withDefaults(defineProps<{
  headline?: string
  subheadline?: string
  categorySlug?: string
  count?: number
  // The direction the cards MOVE: 'left' = right to left, 'right' = left to right.
  direction?: 'left' | 'right'
  // px per second.
  speed?: number
  pauseOnHover?: boolean
  cardWidth?: number
  imageFit?: 'cover' | 'contain'
  cardRadius?: number
  gap?: number
  showNames?: boolean
  showPrices?: boolean
  backgroundColor?: string
  textColor?: string
  showPlaceholder?: boolean
}>(), {
  pauseOnHover: true,
  showNames: true,
  showPrices: true,
})

// Each half of the track must be wider than any screen, or the loop would show a gap.
const MIN_HALF_WIDTH_PX = 2400

const n      = computed(() => Math.max(3, Math.min(Number(props.count) || 12, 30)))
const width  = computed(() => Math.max(120, Number(props.cardWidth) || 260))
const space  = computed(() => props.gap == null ? 16 : Math.max(0, Number(props.gap) || 0))
const pxPerS = computed(() => Math.max(5, Number(props.speed) || 60))
const text   = computed(() => props.textColor || '#1e293b')
const radius = computed(() => props.cardRadius == null ? 12 : props.cardRadius)

// useRequestFetch() (not plain $fetch) so this internal SSR call carries the
// original request's Host header — see pages/product/[slug].vue for why.
const requestFetch = useRequestFetch()

// Keeps theme-preview context flowing into product links — see
// composables/usePreviewThemeQuery.ts.
const { suffix: previewSuffix, previewTheme } = usePreviewThemeQuery()

const { data: products, pending } = await useAsyncData<WcProduct[]>(
  `product-marquee-${props.categorySlug}-${n.value}`,
  () => requestFetch('/api/products', {
    query: {
      category: props.categorySlug || undefined,
      per_page: n.value,
      // Theme-preview isolation: see server/api/products/index.get.ts.
      previewTheme: previewTheme.value || undefined,
    },
  }),
  { default: () => [] as WcProduct[] }
)

const real = computed(() => (products.value ?? []).slice(0, n.value))
const hasProducts = computed(() => !pending.value && real.value.length > 0)

// Repeat the products until one half of the track is wider than any screen.
const step    = computed(() => width.value + space.value)
const perHalf = computed(() => Math.max(real.value.length, Math.ceil(MIN_HALF_WIDTH_PX / step.value)))
const half    = computed(() => Array.from({ length: perHalf.value }, (_, i) => real.value[i % real.value.length]))
const seconds = computed(() => (perHalf.value * step.value) / pxPerS.value)

function price(product: WcProduct) {
  return listingPrice(product) // B2B (Session 4): trade / shop-window aware, identical text for a retail product
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#ffffff', padding: '56px 0' }">
    <div v-if="headline || subheadline" style="max-width:1280px;margin:0 auto;padding:0 24px 28px;">
      <h2 v-if="headline" :style="{ color: text, fontSize: '28px', fontWeight: 800, margin: '0 0 6px' }">{{ headline }}</h2>
      <p v-if="subheadline" :style="{ color: text, opacity: 0.6, fontSize: '15px', margin: 0 }">{{ subheadline }}</p>
    </div>

    <!-- Loading skeleton: static, nothing to loop yet -->
    <div v-if="pending" class="psm-viewport">
      <div style="display:flex;width:max-content;">
        <div v-for="i in 8" :key="i" :style="{ flex: '0 0 auto', width: `${width}px`, marginRight: `${space}px` }">
          <div class="psm-skel" :style="{ aspectRatio: '3/4', borderRadius: `${radius}px`, background: '#e2e8f0' }" />
        </div>
      </div>
    </div>

    <!-- Real products from WooCommerce -->
    <div v-else-if="hasProducts" class="psm-viewport">
      <div
        class="psm-track"
        :class="[direction === 'right' ? 'psm-right' : 'psm-left', pauseOnHover ? 'psm-pause' : '']"
        :style="{ animationDuration: `${seconds}s` }"
      >
        <template v-for="copy in 2" :key="copy">
          <div
            v-for="(product, i) in half"
            :key="`${copy}-${i}`"
            :aria-hidden="copy === 2 ? 'true' : undefined"
            :style="{ flex: '0 0 auto', width: `${width}px`, marginRight: `${space}px` }"
          >
            <a
              :href="`/product/${product.slug}${previewSuffix}`"
              :tabindex="copy === 2 ? -1 : undefined"
              draggable="false"
              style="display:block;text-decoration:none;"
            >
              <div :style="{ aspectRatio: '3/4', borderRadius: `${radius}px`, overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
                <img
                  v-if="product.images?.[0]"
                  :src="product.images[0].src"
                  :alt="copy === 2 ? '' : (product.images[0].alt || product.name)"
                  loading="lazy"
                  draggable="false"
                  :style="{ width: '100%', height: '100%', objectFit: imageFit || 'cover', display: 'block' }"
                />
                <span v-else style="font-size:34px;opacity:0.4;">📷</span>
              </div>
              <div v-if="showNames || showPrices" style="padding:10px 2px 0;">
                <p v-if="showNames" :style="{ margin: '0 0 2px', fontWeight: 600, fontSize: '14px', color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ product.name }}</p>
                <p v-if="showPrices" :style="{ margin: 0, fontWeight: 700, fontSize: '14px', color: text, opacity: 0.8 }">{{ price(product) }}</p>
              </div>
            </a>
          </div>
        </template>
      </div>
    </div>

    <!-- Placeholder fallback (no real products synced/matching yet) -->
    <div v-else-if="showPlaceholder" class="psm-viewport">
      <div style="display:flex;width:max-content;">
        <div v-for="i in 8" :key="i" :style="{ flex: '0 0 auto', width: `${width}px`, marginRight: `${space}px` }">
          <div :style="{ aspectRatio: '3/4', borderRadius: `${radius}px`, background: `hsl(${(i * 47) % 360}, 28%, 90%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }">
            <span style="font-size:34px;opacity:0.4;">🛍</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else style="padding:32px;color:#a0aec0;font-size:14px;text-align:center;">No products found.</div>
  </section>
</template>

<style scoped>
.psm-viewport { overflow: hidden; width: 100%; }
.psm-track { display: flex; width: max-content; animation-timing-function: linear; animation-iteration-count: infinite; }
.psm-left  { animation-name: psm-move-left; }
.psm-right { animation-name: psm-move-right; }
.psm-pause:hover { animation-play-state: paused; }
@keyframes psm-move-left  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
@keyframes psm-move-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.psm-skel { animation: psm-pulse 1.5s ease-in-out infinite; }
@keyframes psm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
/* Visitors who ask for less motion get a still row they can swipe or scroll instead. */
@media (prefers-reduced-motion: reduce) {
  .psm-track { animation: none !important; }
  .psm-viewport { overflow-x: auto; }
}
</style>
