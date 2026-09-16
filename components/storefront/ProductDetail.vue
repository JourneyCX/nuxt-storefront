<script setup lang="ts">
// Live-render counterpart of studio-app's Commerce/ProductDetail.tsx — assigned
// to a theme's "product" slot (Store_theme_manager) and rendered by
// StorefrontRenderer when a tenant has one configured (see
// pages/product/[slug].vue for the fallback to the previous hardcoded page
// when they don't). All data-fetching/variant/cart logic below is ported
// unchanged from that previous hardcoded page — it was already correct and
// tested, this just makes it reusable as a Puck-mapped widget instead of the
// page's only possible rendering.
import type { WcProduct, WcVariation } from '~/server/utils/woocommerce'

const props = withDefaults(defineProps<{
  layout?: 'gallery-left' | 'gallery-right'
}>(), {
  layout: 'gallery-left',
})

const route = useRoute()
const slug  = route.params.slug as string | undefined

// No product slug in the route -- this widget is being used/previewed
// outside an actual /product/[slug] page (e.g. dropped into a homepage
// layout while building a theme, confirmed live 2026-09-14 on tenant 1's
// Dazzle homepage). Skip the fetch entirely rather than calling
// /api/products/undefined and rendering a placeholder below instead of
// crashing the whole page when the response's shape doesn't have the
// fields (images, currency_symbol, ...) the rest of this component assumes.
const hasSlug = !!slug

// Server-side relative $fetch does not carry the original request's Host
// header, so the tenant-resolution middleware (server/middleware/tenant.ts)
// can't identify the store on this internal call and the product silently
// 404s for every tenant. useRequestFetch() forwards the incoming request's
// headers to internal SSR fetches; plain $fetch does not.
const requestFetch = useRequestFetch()

const { data: product, error } = await useAsyncData<WcProduct | null>(
  `product-detail-${slug ?? 'none'}`,
  () => hasSlug ? requestFetch(`/api/products/${slug}`) : Promise.resolve(null),
  { server: true }
)

if (hasSlug && (error.value || !product.value)) {
  throw createError({ statusCode: 404, statusMessage: `Product "${slug}" not found.` })
}

const hasProduct = computed(() => hasSlug && !!product.value)

if (hasProduct.value) {
  useHead({ title: product.value!.name })
}

const { addToCart, cartLoading } = useCart()

const selectedImage = ref(0)
const quantity      = ref(1)

// A "variable" product (product.attributes with variation:true) has no
// price/stock/SKU of its own to sell -- WooCommerce needs the specific
// variation's own id in the cart's add-item call.
const isVariable = computed(() => product.value?.type === 'variable')

const { data: variations } = await useAsyncData<WcVariation[]>(
  `product-detail-variations-${slug}`,
  () => isVariable.value ? requestFetch(`/api/products/${product.value!.id}/variations`) : Promise.resolve([]),
  { server: true }
)

const variationAttributes = computed(() => (product.value?.attributes ?? []).filter(a => a.variation))

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

const activeSource = computed(() => matchedVariation.value ?? product.value!)

// A matched variation's own image (e.g. the Gold option's dedicated photo)
// often isn't one of the parent product's own gallery images at all -- it
// needs to be spliced into one combined, browsable list so the thumbnails,
// and the lightbox's prev/next arrows, still work once a variant is picked
// instead of getting stuck showing only that one variant image.
const galleryImages = computed(() => {
  const base = product.value?.images ?? []
  const variantImage = matchedVariation.value?.image
  if (!variantImage) return base
  if (base.some(img => img.src === variantImage.src)) return base
  return [variantImage, ...base]
})

// Jump to the matched variation's own photo only when it actually has one
// tagged in WooCommerce. Most products have no per-variant image at all
// (the product creation flow has no UI to tag one to a specific option),
// so leave selectedImage untouched in that case -- otherwise every variant
// click would snap the shopper back to the same fixed image regardless of
// which option they picked, or whatever else they were browsing.
watch(matchedVariation, (variation) => {
  const variantImage = variation?.image
  if (!variantImage) return
  const idx = galleryImages.value.findIndex(img => img.src === variantImage.src)
  if (idx !== -1) selectedImage.value = idx
})

const mainImage = computed(() => galleryImages.value[selectedImage.value]?.src ?? '')

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

// Fullscreen image lightbox with prev/next -- opens on the currently
// selected thumbnail and shares selectedImage so the thumbnail strip stays
// in sync with whatever image the shopper navigates to inside it.
const lightboxOpen = ref(false)

function openLightbox() {
  if (!mainImage.value) return
  lightboxOpen.value = true
}
function closeLightbox() {
  lightboxOpen.value = false
}
function stepImage(delta: number) {
  const len = galleryImages.value.length
  if (len < 2) return
  selectedImage.value = (selectedImage.value + delta + len) % len
}

function handleLightboxKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') stepImage(-1)
  else if (e.key === 'ArrowRight') stepImage(1)
}
onMounted(() => window.addEventListener('keydown', handleLightboxKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleLightboxKeydown))
</script>

<template>
  <div v-if="!hasProduct" style="max-width:1200px;margin:0 auto;padding:48px 24px;border:2px dashed #cbd5e0;border-radius:12px;text-align:center;color:#a0aec0;font-size:14px">
    🛍️ Product Detail — this block only shows real data on an actual product page
  </div>
  <div v-else style="max-width:1200px;margin:0 auto;padding:48px 24px">
    <!-- Breadcrumb -->
    <nav style="font-size:13px;color:#718096;margin-bottom:32px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <span>{{ product!.name }}</span>
    </nav>

    <div
      :style="{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start',
      }"
    >
      <!-- Image gallery -->
      <div :style="{ order: props.layout === 'gallery-right' ? 2 : 1 }">
        <div style="position:relative;border-radius:12px;overflow:hidden;background:#f7f8fa;aspect-ratio:1;margin-bottom:12px">
          <img v-if="mainImage" :src="mainImage" :alt="product!.name"
               style="width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in"
               @click="openLightbox" />
          <div v-else style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#a0aec0;font-size:14px">
            No image
          </div>
          <button
            v-if="mainImage"
            @click="openLightbox"
            aria-label="Enlarge image"
            style="position:absolute;bottom:10px;right:10px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.2)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a202c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        </div>
        <div v-if="galleryImages.length > 1" style="display:flex;gap:8px;flex-wrap:wrap">
          <button
            v-for="(img, i) in galleryImages"
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
      <div :style="{ order: props.layout === 'gallery-right' ? 1 : 2 }">
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

    <Teleport to="body">
      <div
        v-if="lightboxOpen"
        @click.self="closeLightbox"
        style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:1000;display:flex;align-items:center;justify-content:center"
      >
        <button
          @click="closeLightbox"
          aria-label="Close"
          style="position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <button
          v-if="galleryImages.length > 1"
          @click="stepImage(-1)"
          aria-label="Previous image"
          style="position:absolute;left:16px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <img
          :src="mainImage" :alt="product!.name"
          style="max-width:88vw;max-height:88vh;object-fit:contain"
          @click.stop
        />

        <button
          v-if="galleryImages.length > 1"
          @click="stepImage(1)"
          aria-label="Next image"
          style="position:absolute;right:16px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        <div
          v-if="galleryImages.length > 1"
          style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);color:#fff;font-size:13px;background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:12px"
        >
          {{ selectedImage + 1 }} / {{ galleryImages.length }}
        </div>
      </div>
    </Teleport>
  </div>
</template>
