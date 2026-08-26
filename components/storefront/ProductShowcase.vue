<script setup lang="ts">
import type { WcProduct } from '~/server/utils/woocommerce'

const props = defineProps<{
  headline?: string
  subheadline?: string
  columns?: 2 | 3 | 4 | 5
  count?: number
  // productCount is an older/alternate name for `count` found in some stored puck_json;
  // treated as an override when present.
  productCount?: number
  // ctaText/ctaUrl add an optional "view all" link, matching studio-app's ProductShowcase.tsx.
  ctaText?: string
  ctaUrl?: string
  // `layout` (e.g. 'editorial') has no current visual implementation — accepted only to
  // stop it leaking as a raw DOM attribute; does not change rendering. Flagged in the
  // schema-drift audit as needing a design decision.
  layout?: string
  cardStyle?: 'classic' | 'minimal' | 'overlay'
  imageAspectRatio?: '1/1' | '4/3' | '3/4'
  showBadge?: boolean
  badgeText?: string
  badgeColor?: string
  showRating?: boolean
  showWishlist?: boolean
  showSalePrice?: boolean
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  cardRadius?: number
  gap?: number
  categorySlug?: string
}>()

const perPage = computed(() => Math.max(1, Math.min(props.productCount ?? props.count ?? 8, 20)))

// useRequestFetch() (not plain $fetch) so this internal SSR call carries the
// original request's Host header -- see pages/product/[slug].vue for why.
const requestFetch = useRequestFetch()
const { data: products, pending } = await useAsyncData<WcProduct[]>(
  `psc-${props.categorySlug}-${perPage.value}`,
  () => requestFetch('/api/products', {
    query: { category: props.categorySlug || undefined, per_page: perPage.value },
  }),
  { default: () => [] as WcProduct[] }
)

const hasProducts = computed(() => !pending.value && (products.value?.length ?? 0) > 0)

const PALETTE = ['#dbeafe', '#fce7f3', '#dcfce7', '#fef3c7', '#ede9fe', '#ffedd5', '#e0f2fe', '#f0fdf4']
const NAMES = ['Artisan Mug', 'Linen Tote', 'Bamboo Set', 'Glass Jar', 'Cotton Wrap', 'Ceramic Bowl', 'Woven Basket', 'Stone Vase']
const PRICES = ['R 249', 'R 399', 'R 189', 'R 329', 'R 159', 'R 449', 'R 299', 'R 219']
const ORIG = ['R 349', 'R 499', 'R 249', 'R 429', 'R 219', 'R 599', 'R 399', 'R 299']

function ph(i: number) { return { bg: PALETTE[i % 8], name: NAMES[i % 8], price: PRICES[i % 8], orig: ORIG[i % 8] } }

const accent = computed(() => props.accentColor || '#2563eb')
const text = computed(() => props.textColor || '#1e293b')
const radius = computed(() => props.cardRadius ?? 12)
const cs = computed(() => props.cardStyle || 'classic')

function wcPrice(p: WcProduct) {
  if (p.sale_price) return `${p.currency_symbol} ${parseFloat(p.sale_price).toFixed(2)}`
  return `${p.currency_symbol} ${parseFloat(p.price || '0').toFixed(2)}`
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor||'#f8fafc', padding:'64px 24px' }">
    <style>
      .psc-card { transition: transform 0.22s ease, box-shadow 0.22s ease; }
      .psc-card:hover { transform: translateY(-5px); box-shadow: 0 14px 36px rgba(0,0,0,0.13); }
    </style>
    <div :style="{ maxWidth:'1280px', margin:'0 auto' }">
      <div v-if="headline || subheadline || ctaText" :style="{ marginBottom:'40px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }">
        <div>
          <h2 v-if="headline" :style="{ color:text, fontSize:'32px', fontWeight:800, margin:'0 0 10px' }">{{ headline }}</h2>
          <p v-if="subheadline" :style="{ color:text, opacity:0.65, fontSize:'17px', margin:0 }">{{ subheadline }}</p>
        </div>
        <a v-if="ctaText" :href="ctaUrl || '#'" :style="{ color: accent, fontSize:'14px', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }">{{ ctaText }} →</a>
      </div>

      <!-- Loading skeleton -->
      <div v-if="pending" :style="{ display:'grid', gridTemplateColumns:`repeat(${columns||4},1fr)`, gap:`${gap||20}px` }">
        <div v-for="i in perPage" :key="i" :style="{ borderRadius:`${radius}px`, overflow:'hidden', backgroundColor:'#fff', border:'1px solid #f1f5f9' }">
          <div :style="{ aspectRatio:imageAspectRatio||'1/1', backgroundColor:PALETTE[(i-1)%8], animation:'pulse 1.5s ease-in-out infinite' }" />
          <div :style="{ padding:'14px 16px 18px' }">
            <div :style="{ height:'14px', background:'#e2e8f0', borderRadius:'4px', marginBottom:'8px', width:'70%' }" />
            <div :style="{ height:'12px', background:'#e2e8f0', borderRadius:'4px', width:'50%' }" />
          </div>
        </div>
      </div>

      <!-- Real WooCommerce products -->
      <div v-else-if="hasProducts" :style="{ display:'grid', gridTemplateColumns:`repeat(${columns||4},1fr)`, gap:`${gap||20}px` }">
        <article v-for="product in products" :key="product.id" class="psc-card"
          :style="cs==='overlay' ? { borderRadius:`${radius}px`, overflow:'hidden', position:'relative', cursor:'pointer' }
                : cs==='minimal' ? { cursor:'pointer' }
                : { borderRadius:`${radius}px`, overflow:'hidden', backgroundColor:'#fff', boxShadow:'0 1px 6px rgba(0,0,0,0.07)', border:'1px solid #f1f5f9', cursor:'pointer' }"
        >
          <!-- image -->
          <div :style="{ position:'relative', aspectRatio:imageAspectRatio||'1/1', backgroundColor:'#f1f5f9', overflow:'hidden', borderRadius:cs==='minimal'?`${radius}px 0 0 0`:undefined }">
            <img v-if="product.images?.[0]" :src="product.images[0].src" :alt="product.name" :style="{ width:'100%', height:'100%', objectFit:'contain', display:'block' }" />
            <div v-else :style="{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px', opacity:0.4 }">🛍</div>
            <span v-if="showBadge" :style="{ position:'absolute', top:'10px', left:'10px', backgroundColor:badgeColor||accent, color:'#fff', fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'4px', textTransform:'uppercase' }">{{ badgeText || 'NEW' }}</span>
            <div v-if="cs==='overlay'" :style="{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)' }" />
          </div>
          <!-- overlay text -->
          <div v-if="cs==='overlay'" :style="{ position:'absolute', bottom:0, left:0, right:0, padding:'16px 16px 20px' }">
            <div v-if="showRating" :style="{ display:'flex', gap:'4px', marginBottom:'8px' }">
              <span v-for="n in 5" :key="n" :style="{ color:n<=4?'#fbbf24':'#d1d5db', fontSize:'12px' }">★</span>
            </div>
            <p :style="{ margin:'0 0 4px', fontWeight:700, fontSize:'15px', color:'#fff' }">{{ product.name }}</p>
            <div :style="{ display:'flex', justifyContent:'space-between', alignItems:'center' }">
              <div>
                <span :style="{ fontWeight:700, fontSize:'17px', color:'#fff' }">{{ wcPrice(product) }}</span>
                <span v-if="showSalePrice && product.regular_price" :style="{ marginLeft:'8px', fontSize:'13px', color:'rgba(255,255,255,0.6)', textDecoration:'line-through' }">R {{ parseFloat(product.regular_price).toFixed(2) }}</span>
              </div>
              <a :href="`/product/${product.slug}`" :style="{ backgroundColor:accent, color:'#fff', padding:'7px 14px', borderRadius:'6px', textDecoration:'none', fontSize:'12px', fontWeight:700 }">View</a>
            </div>
          </div>
          <!-- minimal / classic text -->
          <div v-else-if="cs==='minimal'" :style="{ marginTop:'12px' }">
            <div v-if="showRating" :style="{ display:'flex', gap:'4px', marginBottom:'8px' }">
              <span v-for="n in 5" :key="n" :style="{ color:n<=4?accent:'#d1d5db', fontSize:'12px' }">★</span>
            </div>
            <p :style="{ margin:'0 0 4px', fontWeight:600, fontSize:'15px', color:text }">{{ product.name }}</p>
            <div :style="{ display:'flex', alignItems:'center', gap:'8px' }">
              <span :style="{ fontWeight:700, fontSize:'16px', color:accent }">{{ wcPrice(product) }}</span>
              <span v-if="showSalePrice && product.regular_price" :style="{ fontSize:'13px', color:'#9ca3af', textDecoration:'line-through' }">R {{ parseFloat(product.regular_price).toFixed(2) }}</span>
            </div>
            <a :href="`/product/${product.slug}`" :style="{ marginTop:'10px', display:'block', textAlign:'center', background:'none', border:`1.5px solid ${accent}`, color:accent, padding:'7px 0', borderRadius:'6px', textDecoration:'none', fontSize:'13px', fontWeight:700, width:'100%' }">View Product</a>
          </div>
          <div v-else :style="{ padding:'14px 16px 18px' }">
            <div v-if="showRating" :style="{ display:'flex', gap:'4px', marginBottom:'8px' }">
              <span v-for="n in 5" :key="n" :style="{ color:n<=4?accent:'#d1d5db', fontSize:'12px' }">★</span>
            </div>
            <p :style="{ margin:'0 0 6px', fontWeight:600, fontSize:'15px', color:text, lineHeight:1.35 }">{{ product.name }}</p>
            <div :style="{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }">
              <span :style="{ fontWeight:800, fontSize:'17px', color:text }">{{ wcPrice(product) }}</span>
              <span v-if="showSalePrice && product.regular_price" :style="{ fontSize:'13px', color:'#9ca3af', textDecoration:'line-through' }">R {{ parseFloat(product.regular_price).toFixed(2) }}</span>
            </div>
            <a :href="`/product/${product.slug}`" :style="{ display:'block', textAlign:'center', width:'100%', backgroundColor:accent, color:'#fff', border:'none', padding:'10px 0', borderRadius:'6px', textDecoration:'none', fontSize:'14px', fontWeight:700 }">View Product</a>
          </div>
        </article>
      </div>

      <!-- Placeholder cards (no products found) -->
      <div v-else :style="{ display:'grid', gridTemplateColumns:`repeat(${columns||4},1fr)`, gap:`${gap||20}px` }">
        <div v-for="i in perPage" :key="i" class="psc-card"
          :style="cs==='overlay' ? { borderRadius:`${radius}px`, overflow:'hidden', position:'relative', cursor:'pointer' }
                : cs==='minimal' ? { cursor:'pointer' }
                : { borderRadius:`${radius}px`, overflow:'hidden', backgroundColor:'#fff', boxShadow:'0 1px 6px rgba(0,0,0,0.07)', border:'1px solid #f1f5f9', cursor:'pointer' }"
        >
          <div :style="{ position:'relative', aspectRatio:imageAspectRatio||'1/1', backgroundColor:ph(i-1).bg, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }">
            <span :style="{ fontSize:'40px', opacity:0.5 }">🛍</span>
            <span v-if="showBadge" :style="{ position:'absolute', top:'10px', left:'10px', backgroundColor:badgeColor||accent, color:'#fff', fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'4px', textTransform:'uppercase' }">{{ badgeText || 'NEW' }}</span>
            <div v-if="cs==='overlay'" :style="{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)' }" />
          </div>
          <div v-if="cs==='overlay'" :style="{ position:'absolute', bottom:0, left:0, right:0, padding:'16px 16px 20px' }">
            <p :style="{ margin:'0 0 4px', fontWeight:700, fontSize:'15px', color:'#fff' }">{{ ph(i-1).name }}</p>
            <div :style="{ display:'flex', justifyContent:'space-between', alignItems:'center' }">
              <span :style="{ fontWeight:700, fontSize:'17px', color:'#fff' }">{{ ph(i-1).price }}</span>
              <button :style="{ backgroundColor:accent, color:'#fff', border:'none', padding:'7px 14px', borderRadius:'6px', fontSize:'12px', fontWeight:700 }">Add to Cart</button>
            </div>
          </div>
          <div v-else-if="cs==='minimal'" :style="{ marginTop:'12px' }">
            <p :style="{ margin:'0 0 4px', fontWeight:600, fontSize:'15px', color:text }">{{ ph(i-1).name }}</p>
            <span :style="{ fontWeight:700, fontSize:'16px', color:accent }">{{ ph(i-1).price }}</span>
            <button :style="{ marginTop:'10px', background:'none', border:`1.5px solid ${accent}`, color:accent, padding:'7px 0', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:700, width:'100%', display:'block' }">Add to Cart</button>
          </div>
          <div v-else :style="{ padding:'14px 16px 18px' }">
            <p :style="{ margin:'0 0 6px', fontWeight:600, fontSize:'15px', color:text }">{{ ph(i-1).name }}</p>
            <div :style="{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }">
              <span :style="{ fontWeight:800, fontSize:'17px', color:text }">{{ ph(i-1).price }}</span>
              <span v-if="showSalePrice" :style="{ fontSize:'13px', color:'#9ca3af', textDecoration:'line-through' }">{{ ph(i-1).orig }}</span>
            </div>
            <button :style="{ width:'100%', backgroundColor:accent, color:'#fff', border:'none', padding:'10px 0', borderRadius:'6px', cursor:'pointer', fontSize:'14px', fontWeight:700 }">Add to Cart</button>
          </div>
        </div>
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
