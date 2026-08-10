<script setup lang="ts">
import type { WcProduct } from '~/server/utils/woocommerce'

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

const mainImage = computed(() => product.value?.images?.[selectedImage.value]?.src ?? '')
const price     = computed(() => {
  const p = product.value!
  return p.sale_price
    ? `R ${parseFloat(p.sale_price).toFixed(2)}`
    : `R ${parseFloat(p.price || '0').toFixed(2)}`
})
const wasPrice = computed(() => {
  const p = product.value!
  return p.on_sale && p.regular_price
    ? `R ${parseFloat(p.regular_price).toFixed(2)}`
    : null
})

async function handleAdd() {
  await addToCart(product.value!.id, quantity.value)
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
          <span style="font-size:28px;font-weight:700;color:#c53030" v-if="product!.on_sale">{{ price }}</span>
          <span style="font-size:28px;font-weight:700;color:#1a202c" v-else>{{ price }}</span>
          <span v-if="wasPrice" style="font-size:18px;color:#a0aec0;text-decoration:line-through">{{ wasPrice }}</span>
        </div>

        <div
          v-if="product!.short_description"
          style="font-size:15px;color:#4a5568;line-height:1.7;margin-bottom:24px"
          v-html="product!.short_description"
        />

        <!-- Stock status -->
        <div style="margin-bottom:24px">
          <span
            :style="{
              display:'inline-block', padding:'4px 12px', borderRadius:'20px', fontSize:'13px', fontWeight:600,
              background: product!.stock_status === 'instock' ? '#f0fff4' : '#fff5f5',
              color:      product!.stock_status === 'instock' ? '#276749' : '#c53030',
            }"
          >
            {{ product!.stock_status === 'instock' ? 'In Stock' : 'Out of Stock' }}
          </span>
        </div>

        <!-- Quantity + Add to Cart -->
        <div v-if="product!.stock_status === 'instock'" style="display:flex;gap:12px;align-items:center;margin-bottom:24px">
          <div style="display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
            <button @click="quantity = Math.max(1, quantity - 1)"
                    style="width:40px;height:44px;background:none;border:none;cursor:pointer;font-size:18px;color:#4a5568">−</button>
            <span style="min-width:40px;text-align:center;font-size:16px;font-weight:600;color:#1a202c">{{ quantity }}</span>
            <button @click="quantity++"
                    style="width:40px;height:44px;background:none;border:none;cursor:pointer;font-size:18px;color:#4a5568">+</button>
          </div>
          <button
            @click="handleAdd"
            :disabled="cartLoading"
            style="flex:1;background:#2b6cb0;color:#fff;border:none;height:44px;border-radius:6px;font-size:16px;font-weight:700;cursor:pointer;transition:background 0.2s"
          >
            {{ cartLoading ? 'Adding...' : 'Add to Cart' }}
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
