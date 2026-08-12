<script setup lang="ts">
import type { WcProduct, WcVariation } from '~/server/utils/woocommerce'

const route = useRoute()
const slug  = route.params.slug as string

// Server-side relative $fetch does not carry the original request's Host
// header, so the tenant-resolution middleware (server/middleware/tenant.ts)
// can't identify the store on this internal call and the product silently
// 404s for every tenant. useRequestFetch() forwards the incoming request's
// headers to internal SSR fetches; plain $fetch does not.
const requestFetch = useRequestFetch()

const { data: product, error } = await useAsyncData<WcProduct>(
  `product-${slug}`,
  () => requestFetch(`/api/products/${slug}`),
  { server: true }
)

if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: `Product "${slug}" not found.` })
}

useHead({ title: product.value.name })

const { addToCart, cartLoading } = useCart()

const selectedImage = ref(0)
const quantity      = ref(1)

// ── Variants ────────────────────────────────────────────────────────────────
// A "variable" product (product.attributes with variation:true) has no
// price/stock/SKU of its own to sell -- WooCommerce needs the specific
// variation's own id in the cart's add-item call. Confirmed live
// (2026-08-12): without this, the page rendered the parent's own price and
// an Add to Cart button with no way to pick an option at all.
const isVariable = computed(() => product.value?.type === 'variable')

const { data: variations } = await useAsyncData<WcVariation[]>(
  `product-variations-${slug}`,
  () => isVariable.value ? requestFetch(`/api/products/${product.value!.id}/variations`) : Promise.resolve([]),
  { server: true }
)

const variationAttributes = computed(() => (product.value?.attributes ?? []).filter(a => a.variation))

// One selected option value per variation attribute (e.g. { Color: null }),
// re-seeded whenever the product itself changes.
const selectedOptions = reactive<Record<string, string | null>>({})
watch(variationAttributes, (attrs) => {
  for (const key of Object.keys(selectedOptions)) delete selectedOptions[key]
  for (const attr of attrs) selectedOptions[attr.name] = null
}, { immediate: true })

const allOptionsSelected = computed(() =>
  variationAttributes.value.length > 0 && variationAttributes.value.every(a => !!selectedOptions[a.name])
)

const matchedVariation = computed<WcVariation | null>(() => {
  if (!allOptionsSelected.value || !variations.value) return null
  return variations.value.find(v =>
    variationAttributes.value.every(attr =>
      v.attributes.some(va => va.name === attr.name && va.option === selectedOptions[attr.name])
    )
  ) ?? null
})

function selectOption(attrName: string, option: string) {
  selectedOptions[attrName] = selectedOptions[attrName] === option ? null : option
}

// ── Price / stock / image, variant-aware ──────────────────────────────────
const activeSource = computed(() => matchedVariation.value ?? product.value!)

const mainImage = computed(() => {
  if (matchedVariation.value?.image) return matchedVariation.value.image.src
  return product.value?.images?.[selectedImage.value]?.src ?? ''
})

const price = computed(() => {
  const s = activeSource.value
  const symbol = product.value!.currency_symbol
  const amount = s.sale_price ? s.sale_price : (s.price || '0')
  const prefix = isVariable.value && !matchedVariation.value ? 'From ' : ''
  return `${prefix}${symbol} ${parseFloat(amount).toFixed(2)}`
})
const wasPrice = computed(() => {
  const s = activeSource.value
  return s.on_sale && s.regular_price
    ? `${product.value!.currency_symbol} ${parseFloat(s.regular_price).toFixed(2)}`
    : null
})

// No stock claim is shown until a variable product's selection resolves to
// one real variation -- the parent itself carries no sellable stock.
const effectiveStock = computed<'instock' | 'outofstock' | 'onbackorder' | null>(() => {
  if (!isVariable.value) return product.value!.stock_status
  return matchedVariation.value?.stock_status ?? null
})

const canAddToCart = computed(() => {
  if (isVariable.value) return !!matchedVariation.value && effectiveStock.value === 'instock'
  return effectiveStock.value === 'instock'
})

const addToCartLabel = computed(() => {
  if (cartLoading.value) return 'Adding...'
  if (isVariable.value && !matchedVariation.value) return 'Select options'
  if (effectiveStock.value !== 'instock') return 'Out of Stock'
  return 'Add to Cart'
})

async function handleAdd() {
  if (!canAddToCart.value) return
  const id = matchedVariation.value?.id ?? product.value!.id
  await addToCart(id, quantity.value)
}
</script>

<template>
  <div style="max-width:1200px;margin:0 auto;padding:48px 24px">
    <!-- Breadcrumb -->
    <nav style="font-size:13px;color:#718096;margin-bottom:32px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <span>{{ product!.name }}</span>
    </nav>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start">

      <!-- Image gallery -->
      <div>
        <div style="border-radius:12px;overflow:hidden;background:#f7f8fa;aspect-ratio:1;margin-bottom:12px">
          <img v-if="mainImage" :src="mainImage" :alt="product!.name"
               style="width:100%;height:100%;object-fit:cover;display:block" />
          <div v-else style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#a0aec0;font-size:14px">
            No image
          </div>
        </div>
        <div v-if="product!.images.length > 1" style="display:flex;gap:8px;flex-wrap:wrap">
          <button
            v-for="(img, i) in product!.images"
            :key="i"
            @click="selectedImage = i"
            :style="{
              width:'64px', height:'64px', padding:0, border:`2px solid ${selectedImage===i?'#3182ce':'#e2e8f0'}`,
              borderRadius:'6px', overflow:'hidden', cursor:'pointer', background:'none'
            }"
          >
            <img :src="img.src" :alt="img.alt" style="width:100%;height:100%;object-fit:cover;display:block" />
          </button>
        </div>
      </div>

      <!-- Product info -->
      <div>
        <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#1a202c;line-height:1.2">
          {{ product!.name }}
        </h1>

        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:20px">
          <span style="font-size:28px;font-weight:700;color:#c53030" v-if="activeSource.on_sale">{{ price }}</span>
          <span style="font-size:28px;font-weight:700;color:#1a202c" v-else>{{ price }}</span>
          <span v-if="wasPrice" style="font-size:18px;color:#a0aec0;text-decoration:line-through">{{ wasPrice }}</span>
        </div>

        <div
          v-if="product!.short_description"
          style="font-size:15px;color:#4a5568;line-height:1.7;margin-bottom:24px"
          v-html="product!.short_description"
        />

        <!-- Variant option pickers -->
        <div v-for="attr in variationAttributes" :key="attr.name" style="margin-bottom:20px">
          <div style="font-size:14px;font-weight:600;color:#1a202c;margin-bottom:8px">
            {{ attr.name }}<span v-if="selectedOptions[attr.name]">: {{ selectedOptions[attr.name] }}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button
              v-for="option in attr.options"
              :key="option"
              @click="selectOption(attr.name, option)"
              :style="{
                padding:'8px 16px', borderRadius:'6px', fontSize:'14px', cursor:'pointer',
                border: `2px solid ${selectedOptions[attr.name] === option ? '#2b6cb0' : '#e2e8f0'}`,
                background: selectedOptions[attr.name] === option ? '#ebf4ff' : '#fff',
                color: '#1a202c', fontWeight: selectedOptions[attr.name] === option ? 700 : 400,
              }"
            >
              {{ option }}
            </button>
          </div>
        </div>

        <!-- Stock status -->
        <div v-if="effectiveStock" style="margin-bottom:24px">
          <span
            :style="{
              display:'inline-block', padding:'4px 12px', borderRadius:'20px', fontSize:'13px', fontWeight:600,
              background: effectiveStock === 'instock' ? '#f0fff4' : '#fff5f5',
              color:      effectiveStock === 'instock' ? '#276749' : '#c53030',
            }"
          >
            {{ effectiveStock === 'instock' ? 'In Stock' : 'Out of Stock' }}
          </span>
        </div>

        <!-- Quantity + Add to Cart -->
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:24px">
          <div style="display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
            <button @click="quantity = Math.max(1, quantity - 1)"
                    style="width:40px;height:44px;background:none;border:none;cursor:pointer;font-size:18px;color:#4a5568">−</button>
            <span style="min-width:40px;text-align:center;font-size:16px;font-weight:600;color:#1a202c">{{ quantity }}</span>
            <button @click="quantity++"
                    style="width:40px;height:44px;background:none;border:none;cursor:pointer;font-size:18px;color:#4a5568">+</button>
          </div>
          <button
            @click="handleAdd"
            :disabled="cartLoading || !canAddToCart"
            :style="{
              flex:1, color:'#fff', border:'none', height:'44px', borderRadius:'6px', fontSize:'16px', fontWeight:700,
              cursor: (cartLoading || !canAddToCart) ? 'not-allowed' : 'pointer',
              background: (cartLoading || !canAddToCart) ? '#a0aec0' : '#2b6cb0',
              transition:'background 0.2s'
            }"
          >
            {{ addToCartLabel }}
          </button>
        </div>

        <!-- Full description -->
        <div v-if="product!.description"
             style="border-top:1px solid #e2e8f0;padding-top:24px;margin-top:8px;font-size:15px;color:#4a5568;line-height:1.7"
             v-html="product!.description"
        />
      </div>
    </div>
  </div>
  <!-- No <CartDrawer /> here -- layouts/default.vue already renders exactly one
       via SiteHeader.vue for every page. A second instance here duplicated the
       shared cartOpen state's DOM, causing two overlapping backdrop/drawer
       elements to fight over z-index -- confirmed as why clicking the header
       cart icon appeared to do nothing on this page specifically. -->
</template>
