<script setup lang="ts">
import type { WcProduct } from '~/server/utils/woocommerce'

// NOTE: Vue casts an *absent* Boolean-typed prop to `false`, not `undefined` — so
// `props.showAddToCart ?? true` never fires for pages that simply don't have the field
// stored. withDefaults() sets the real default before that cast happens, which is the
// only correct way to get "true unless the merchant explicitly set it false" behaviour.
const props = withDefaults(defineProps<{
  headline?:       string
  columns?:        number
  rows?:           number
  // productCount is an older/alternate name found in some stored puck_json, used in
  // place of the rows×columns computation. Treated as an override when present so
  // existing merchant-configured values aren't discarded.
  productCount?:   number
  // showAddToCart/showPrices were part of an earlier richer schema some live themes were
  // authored against; restored as additive optional fields (both default to true, i.e.
  // the previously-unconditional behaviour, so existing pages render unchanged).
  showAddToCart?:  boolean
  showPrices?:     boolean
  categorySlug?:   string
  showPlaceholder?: boolean
  backgroundColor?: string
  gap?:            number
}>(), {
  showAddToCart: true,
  showPrices: true,
})

const perPage = computed(() => props.productCount ?? ((props.columns || 3) * (props.rows || 2)))

// A Product Filter block elsewhere on the page drives this grid via the
// `category`/`max_price` URL query params (see ProductFilter.vue) -- but only
// when this grid's own design-time categorySlug is blank. A grid pinned to a
// specific category at design time (e.g. a "Featured" section) is a curated,
// fixed section and must not be silently re-filtered by an unrelated filter
// widget elsewhere on the same page.
const route = useRoute()
const queryCategory = computed(() => {
  const q = route.query.category
  return Array.isArray(q) ? q[0] : q
})
const queryMaxPrice = computed(() => {
  const q = route.query.max_price
  const v = Array.isArray(q) ? q[0] : q
  return v ? Number(v) : undefined
})
const effectiveCategory = computed(() => (props.categorySlug ? props.categorySlug : (queryCategory.value || undefined)))
const effectiveMaxPrice = computed(() => (props.categorySlug ? undefined : queryMaxPrice.value))

// useRequestFetch() (not plain $fetch) so this internal SSR call carries the
// original request's Host header -- see pages/product/[slug].vue for why.
const requestFetch = useRequestFetch()
const { data: products, pending } = await useAsyncData<WcProduct[]>(
  `products-${props.categorySlug}-${perPage.value}`,
  () => requestFetch('/api/products', {
    query: {
      category:  effectiveCategory.value,
      per_page:  perPage.value,
      max_price: effectiveMaxPrice.value,
    },
  }),
  { default: () => [] as WcProduct[], watch: [effectiveCategory, effectiveMaxPrice, perPage] }
)

const showGrid = computed(() =>
  !pending.value && (products.value?.length ?? 0) > 0
)

function hue(index: number) {
  return `hsl(${index * 37}, 30%, 90%)`
}

function price(product: WcProduct) {
  const sym = product.currency_symbol
  if (product.sale_price) return `${sym} ${parseFloat(product.sale_price).toFixed(2)}`
  return `${sym} ${parseFloat(product.price || '0').toFixed(2)}`
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#f7f8fa', padding: '48px 24px' }">
    <div :style="{ maxWidth: '1200px', margin: '0 auto' }">
      <h2 v-if="headline" :style="{ margin: '0 0 32px', fontSize: '28px', fontWeight: 700, color: '#1a202c' }">
        {{ headline }}
      </h2>

      <!-- Loading skeleton -->
      <div v-if="pending" :style="{ display:'grid', gridTemplateColumns:`repeat(${columns||3},1fr)`, gap:`${gap||24}px` }">
        <div v-for="i in perPage" :key="i" :style="{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', background:'#fff' }">
          <div :style="{ height:'200px', background:hue(i-1), animation:'pulse 1.5s ease-in-out infinite' }" />
          <div :style="{ padding:'16px' }">
            <div :style="{ height:'14px', background:'#e2e8f0', borderRadius:'4px', marginBottom:'8px', width:'70%' }" />
            <div :style="{ height:'12px', background:'#e2e8f0', borderRadius:'4px', width:'50%' }" />
          </div>
        </div>
      </div>

      <!-- Real products from WooCommerce -->
      <div v-else-if="showGrid" :style="{ display:'grid', gridTemplateColumns:`repeat(${columns||3},1fr)`, gap:`${gap||24}px` }">
        <article
          v-for="product in products"
          :key="product.id"
          :style="{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', background:'#fff', display:'flex', flexDirection:'column' }"
        >
          <a :href="`/product/${product.slug}`" :style="{ display:'block' }">
            <div :style="{ height:'200px', overflow:'hidden', background:'#f7f8fa' }">
              <img
                v-if="product.images?.[0]"
                :src="product.images[0].src"
                :alt="product.images[0].alt || product.name"
                :style="{ width:'100%', height:'100%', objectFit:'contain', display:'block', transition:'transform 0.3s' }"
              />
              <div v-else :style="{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#a0aec0', fontSize:'13px' }">
                No Image
              </div>
            </div>
          </a>
          <div :style="{ padding:'16px', flex:1, display:'flex', flexDirection:'column' }">
            <a :href="`/product/${product.slug}`" :style="{ textDecoration:'none' }">
              <p :style="{ margin:'0 0 6px', fontWeight:600, fontSize:'15px', color:'#2d3748', lineHeight:1.3 }">{{ product.name }}</p>
            </a>
            <!-- div, not p: WooCommerce's short_description is itself already
                 wrapped in its own <p>...</p> -- nesting it inside a <p> here
                 produces invalid <p><p>...</p></p> HTML, which the browser
                 silently splits into sibling <p> tags while parsing the raw
                 SSR HTML (before Vue ever runs), so the DOM Vue hydrates
                 against no longer matches what it rendered -- a real,
                 confirmed hydration mismatch that made the description
                 disappear after hydration on every category/grid listing.
                 The single-product page's equivalent block already used a
                 div for this exact reason; this one didn't. -->
            <div v-if="product.short_description" :style="{ margin:'0 0 12px', color:'#718096', fontSize:'13px', lineHeight:1.5, flex:1 }" v-html="product.short_description" />
            <div :style="{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }">
              <span v-if="showPrices" :style="{ fontWeight:700, fontSize:'16px', color: product.on_sale ? '#c53030' : '#2d3748' }">
                {{ price(product) }}
              </span>
              <a
                v-if="showAddToCart"
                :href="`/product/${product.slug}`"
                :style="{ background: product.stock_status === 'instock' ? '#3182ce' : '#a0aec0', color:'#fff', padding:'8px 16px', borderRadius:'4px', textDecoration:'none', fontSize:'13px', fontWeight:600, pointerEvents: product.stock_status !== 'instock' ? 'none' : 'auto' }"
              >
                {{ product.stock_status === 'instock' ? 'View Product' : 'Out of Stock' }}
              </a>
            </div>
          </div>
        </article>
      </div>

      <!-- Placeholder fallback (Phase 1 mode or no products) -->
      <template v-else-if="showPlaceholder !== false">
        <div :style="{ display:'grid', gridTemplateColumns:`repeat(${columns||3},1fr)`, gap:`${gap||24}px` }">
          <div v-for="i in perPage" :key="i" :style="{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', background:'#fff' }">
            <div :style="{ height:'200px', background:hue(i-1), display:'flex', alignItems:'center', justifyContent:'center', color:'#a0aec0', fontSize:'13px' }">
              Product Image
            </div>
            <div :style="{ padding:'16px' }">
              <p :style="{ margin:'0 0 6px', fontWeight:600, fontSize:'15px', color:'#2d3748' }">Product {{ i }}</p>
              <p :style="{ margin:'0 0 12px', color:'#718096', fontSize:'13px' }">Short product description</p>
              <div :style="{ display:'flex', justifyContent:'space-between', alignItems:'center' }">
                <span v-if="showPrices" :style="{ fontWeight:700, fontSize:'16px', color:'#2d3748' }">R 299.00</span>
                <button v-if="showAddToCart" :style="{ background:'#3182ce', color:'#fff', border:'none', padding:'8px 16px', borderRadius:'4px', cursor:'pointer', fontSize:'13px', fontWeight:600 }">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-else :style="{ color:'#a0aec0', fontSize:'14px', padding:'32px', textAlign:'center' }">
        No products found.
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
