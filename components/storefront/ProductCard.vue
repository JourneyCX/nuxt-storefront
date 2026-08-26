<script setup lang="ts">
import type { WcProduct } from '~/server/utils/woocommerce'

const props = defineProps<{
  productName?:  string
  productPrice?: string
  productImage?: string
  productSlug?:  string
  buttonText?:   string
  buttonColor?:  string
  showPrice?:    boolean
}>()

// When a productSlug is provided, fetch the live product from WooCommerce.
// useRequestFetch() (not plain $fetch) so this internal SSR call carries the
// original request's Host header -- see pages/product/[slug].vue for why.
const requestFetch = useRequestFetch()
const { data: wcProduct } = props.productSlug
  ? await useAsyncData<WcProduct | null>(
      `card-${props.productSlug}`,
      () => requestFetch(`/api/products/${props.productSlug}`).catch(() => null),
      { default: () => null }
    )
  : { data: ref<WcProduct | null>(null) }

const name  = computed(() => wcProduct.value?.name  ?? props.productName  ?? 'Product Name')
const price = computed(() => {
  if (wcProduct.value) {
    const p = wcProduct.value.sale_price || wcProduct.value.price
    return `${wcProduct.value.currency_symbol} ${parseFloat(p || '0').toFixed(2)}`
  }
  return props.productPrice ?? 'R 299.00'
})
const image = computed(() => wcProduct.value?.images?.[0]?.src ?? props.productImage ?? '')
const slug  = computed(() => wcProduct.value?.slug ?? props.productSlug ?? '')
const inStock = computed(() => wcProduct.value ? wcProduct.value.stock_status === 'instock' : true)

async function handleAddToCart() {
  if (wcProduct.value) {
    const { addToCart } = useCart()
    await addToCart(wcProduct.value.id)
  }
}
</script>

<template>
  <div :style="{ border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', background:'#fff', maxWidth:'320px', display:'flex', flexDirection:'column' }">
    <a :href="slug ? `/product/${slug}` : '#'" :style="{ display:'block' }">
      <div :style="{ height:'220px', overflow:'hidden', background:'#f7f8fa', display:'flex', alignItems:'center', justifyContent:'center' }">
        <img v-if="image" :src="image" :alt="name" :style="{ width:'100%', height:'100%', objectFit:'contain' }" />
        <span v-else :style="{ color:'#a0aec0', fontSize:'13px' }">Product Image</span>
      </div>
    </a>
    <div :style="{ padding:'16px', flex:1, display:'flex', flexDirection:'column' }">
      <a :href="slug ? `/product/${slug}` : '#'" :style="{ textDecoration:'none' }">
        <p :style="{ margin:'0 0 6px', fontWeight:600, fontSize:'15px', color:'#2d3748' }">{{ name }}</p>
      </a>
      <p v-if="showPrice !== false" :style="{ margin:'0 0 14px', fontWeight:700, fontSize:'17px', color:'#2d3748', flex:1 }">
        {{ price }}
      </p>
      <button
        v-if="wcProduct"
        @click="handleAddToCart"
        :disabled="!inStock"
        :style="{ width:'100%', background: inStock ? (buttonColor||'#3182ce') : '#a0aec0', color:'#fff', border:'none', padding:'10px 0', borderRadius:'4px', cursor: inStock ? 'pointer' : 'not-allowed', fontWeight:600, fontSize:'14px' }"
      >
        {{ inStock ? (buttonText || 'Add to Cart') : 'Out of Stock' }}
      </button>
      <button
        v-else
        :style="{ width:'100%', background:buttonColor||'#3182ce', color:'#fff', border:'none', padding:'10px 0', borderRadius:'4px', cursor:'pointer', fontWeight:600, fontSize:'14px' }"
      >
        {{ buttonText || 'Add to Cart' }}
      </button>
    </div>
  </div>
</template>
