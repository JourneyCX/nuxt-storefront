<script setup lang="ts">
import type { WcProduct } from '~/server/utils/woocommerce'

// NOTE: Vue casts an *absent* Boolean-typed prop to `false`, not `undefined` — so
// `props.showArrows ?? true` would never fire for pages that simply don't have the field
// stored. withDefaults() sets the real default before that cast happens.
const props = withDefaults(defineProps<{
  headline?: string
  subheadline?: string
  viewAllText?: string
  viewAllUrl?: string
  count?: number
  // productCount is an older/alternate name for `count` found in some stored puck_json;
  // treated as an override so existing merchant-configured values aren't discarded.
  productCount?: number
  cardWidth?: number
  showArrows?: boolean
  showDots?: boolean
  showAddToCart?: boolean
  showPrices?: boolean
  // autoplay was part of an earlier schema; the carousel has no auto-advance timer in
  // either renderer today, and stored data always has it set to false, so it's accepted
  // here purely to stop the attribute leak — not wired to real behaviour.
  autoplay?: boolean
  showBadge?: boolean
  badgeText?: string
  // badgeLabel is an older/alternate name for `badgeText` found in some stored
  // puck_json; treated as an override, matching studio-app's ProductCarousel.tsx.
  badgeLabel?: string
  badgeColor?: string
  showRating?: boolean
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  cardRadius?: number
  categorySlug?: string
  // showPlaceholder governs the fallback shown when there are zero real products
  // (no products synced yet, or the category filter matches nothing) — same
  // semantics as ProductGrid.vue's own field. Real products always win over
  // this when any exist, regardless of its value.
  showPlaceholder?: boolean
}>(), {
  showArrows: true,
  showDots: false,
  showAddToCart: true,
  showPrices: true,
})

const trackRef = ref<HTMLDivElement | null>(null)
const clamp = computed(() => Math.max(2, Math.min(props.productCount ?? props.count ?? 8, 20)))
const badge = computed(() => props.badgeLabel ?? props.badgeText)

function scroll(dir: 'left' | 'right') {
  if (!trackRef.value) return
  const width = (props.cardWidth || 220) + 16
  trackRef.value.scrollBy({ left: dir === 'right' ? width : -width, behavior: 'smooth' })
}

// Real synced products — same fetch pattern as ProductGrid.vue. useRequestFetch()
// (not plain $fetch) so this internal SSR call carries the original request's
// Host header — see pages/product/[slug].vue for why.
const requestFetch = useRequestFetch()
const { data: products, pending } = await useAsyncData<WcProduct[]>(
  `carousel-products-${props.categorySlug}-${clamp.value}`,
  () => requestFetch('/api/products', {
    query: {
      category: props.categorySlug || undefined,
      per_page: clamp.value,
    },
  }),
  { default: () => [] as WcProduct[] }
)

const showCarousel = computed(() =>
  !pending.value && (products.value?.length ?? 0) > 0
)

function price(product: WcProduct) {
  if (product.sale_price) return `R ${parseFloat(product.sale_price).toFixed(2)}`
  return `R ${parseFloat(product.price || '0').toFixed(2)}`
}
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
          <a v-if="viewAllText" :href="viewAllUrl || '/shop'" :style="{ color: accentColor || '#2563eb', fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }">
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
            :style="{ width: `${cardWidth || 220}px`, flexShrink: 0, backgroundColor: '#fff', borderRadius: `${cardRadius || 12}px`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }">
            <div style="width:100%;aspect-ratio:1/1;background:#e2e8f0;animation:pulse 1.5s ease-in-out infinite;" />
            <div style="padding:12px 14px 16px;">
              <div style="height:14px;background:#e2e8f0;border-radius:4px;margin-bottom:8px;width:70%;" />
              <div style="height:12px;background:#e2e8f0;border-radius:4px;width:50%;" />
            </div>
          </div>
        </template>

        <!-- Real products from WooCommerce -->
        <template v-else-if="showCarousel">
          <div v-for="product in products" :key="product.id"
            :style="{ width: `${cardWidth || 220}px`, flexShrink: 0, backgroundColor: '#fff', borderRadius: `${cardRadius || 12}px`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }">
            <a :href="`/product/${product.slug}`" style="display:block;">
              <div style="position:relative;width:100%;aspect-ratio:1/1;background-color:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                <img
                  v-if="product.images?.[0]"
                  :src="product.images[0].src"
                  :alt="product.images[0].alt || product.name"
                  style="width:100%;height:100%;object-fit:cover;"
                />
                <span v-else style="font-size:36px;opacity:0.45;">📷</span>
                <span v-if="showBadge && badge" :style="{ position: 'absolute', top: '10px', left: '10px', backgroundColor: badgeColor || '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }">
                  {{ badge }}
                </span>
              </div>
            </a>
            <div style="padding:12px 14px 16px;">
              <div v-if="showRating" style="display:flex;gap:2px;margin-bottom:6px;">
                <span v-for="n in 5" :key="n" :style="{ color: n <= 4 ? (accentColor || '#2563eb') : '#d1d5db', fontSize: '11px' }">★</span>
              </div>
              <a :href="`/product/${product.slug}`" style="text-decoration:none;">
                <p :style="{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: textColor || '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ product.name }}</p>
              </a>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
                <span v-if="showPrices" :style="{ fontWeight: 800, fontSize: '16px', color: product.on_sale ? '#c53030' : (textColor || '#1e293b') }">{{ price(product) }}</span>
                <a
                  v-if="showAddToCart"
                  :href="`/product/${product.slug}`"
                  :style="{ backgroundColor: product.stock_status === 'instock' ? (accentColor || '#2563eb') : '#a0aec0', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', textDecoration: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, pointerEvents: product.stock_status !== 'instock' ? 'none' : 'auto' }"
                >{{ product.stock_status === 'instock' ? '+ Cart' : 'Sold Out' }}</a>
              </div>
            </div>
          </div>
        </template>

        <!-- Placeholder fallback (no real products synced/matching yet) -->
        <template v-else-if="showPlaceholder !== false">
          <div v-for="i in clamp" :key="i"
            :style="{ width: `${cardWidth || 220}px`, flexShrink: 0, backgroundColor: '#fff', borderRadius: `${cardRadius || 12}px`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }">
            <div style="position:relative;width:100%;aspect-ratio:1/1;background-color:#e2e8f0;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:36px;opacity:0.45;">🛍</span>
              <span v-if="showBadge && badge" :style="{ position: 'absolute', top: '10px', left: '10px', backgroundColor: badgeColor || '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }">
                {{ badge }}
              </span>
            </div>
            <div style="padding:12px 14px 16px;">
              <div v-if="showRating" style="display:flex;gap:2px;margin-bottom:6px;">
                <span v-for="n in 5" :key="n" :style="{ color: n <= 4 ? (accentColor || '#2563eb') : '#d1d5db', fontSize: '11px' }">★</span>
              </div>
              <p :style="{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: textColor || '#1e293b' }">Product Name</p>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
                <span v-if="showPrices" :style="{ fontWeight: 800, fontSize: '16px', color: textColor || '#1e293b' }">R 299</span>
                <button v-if="showAddToCart" :style="{ backgroundColor: accentColor || '#2563eb', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }">+ Cart</button>
              </div>
            </div>
          </div>
        </template>

        <div v-else style="padding:32px;color:#a0aec0;font-size:14px;">No products found.</div>
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
