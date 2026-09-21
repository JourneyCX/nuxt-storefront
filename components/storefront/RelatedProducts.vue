<script setup lang="ts">
// Live-render counterpart of studio-app's Commerce/RelatedProducts.tsx — a
// standalone widget (not baked into ProductDetail.vue) so merchants can drag
// it anywhere on the "product" template, e.g. below ProductTabs, the same way
// ProductTabs.vue itself is a separate draggable block from ProductDetail.vue.
// Self-fetches the current product by the page's own URL slug, same pattern
// as ProductTabs.vue -- there's no cross-widget "current product" context
// mechanism in this app, so every product-aware widget resolves it
// independently.
import type { WcProduct } from '~/server/utils/woocommerce'

const props = withDefaults(defineProps<{
  heading?: string
  count?:   number
}>(), {
  heading: 'You May Also Like',
  count:   4,
})

const route = useRoute()
const slug  = route.params.slug as string | undefined
const hasSlug = !!slug

// Server-side relative $fetch does not carry the original request's Host
// header -- see ProductDetail.vue's identical comment; same fix required
// here since this component self-fetches independently.
const requestFetch = useRequestFetch()

const { data: product } = await useAsyncData<WcProduct | null>(
  `related-products-source-${slug ?? 'none'}`,
  () => hasSlug ? requestFetch(`/api/products/${slug}`) : Promise.resolve(null),
  { server: true },
)

// "You may also like" -- no real recommendation engine exists, so this picks
// products from the current product's own first category (closest thing to
// a relevance signal WooCommerce gives us for free), then pads with the
// most recently added products if that category doesn't have enough, always
// excluding the product being viewed.
const { data: relatedProducts } = await useAsyncData<WcProduct[]>(
  `related-products-${slug}-${props.count}`,
  async () => {
    if (!product.value) return []
    const currentId = product.value.id
    const categorySlug = product.value.categories?.[0]?.slug
    const picked: WcProduct[] = []
    const seen = new Set<number>([currentId])

    if (categorySlug) {
      const sameCategory = await requestFetch<WcProduct[]>('/api/products', {
        query: { category: categorySlug, per_page: props.count + 1 },
      })
      for (const p of sameCategory) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        picked.push(p)
        if (picked.length >= props.count) break
      }
    }

    if (picked.length < props.count) {
      const recent = await requestFetch<WcProduct[]>('/api/products', {
        query: { per_page: props.count + 1, orderby: 'date', order: 'desc' },
      })
      for (const p of recent) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        picked.push(p)
        if (picked.length >= props.count) break
      }
    }

    return picked
  },
  { server: true, default: () => [] as WcProduct[], watch: [() => product.value?.id, () => props.count] }
)

function relatedPrice(p: WcProduct) {
  const sym = product.value?.currency_symbol ?? ''
  const amount = p.sale_price ? p.sale_price : (p.price || '0')
  return `${sym} ${parseFloat(amount).toFixed(2)}`
}
</script>

<template>
  <div v-if="!hasSlug" style="max-width:1200px;margin:0 auto;padding:48px 24px;border:2px dashed #cbd5e0;border-radius:12px;text-align:center;color:#a0aec0;font-size:14px">
    🛍️ Related Products — this block only shows real data on an actual product page
  </div>
  <section v-else-if="relatedProducts && relatedProducts.length > 0" style="max-width:1200px;margin:0 auto;padding:48px 24px">
    <h2 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#1a202c">{{ heading }}</h2>
    <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: '24px' }" class="sb-grid">
      <a
        v-for="rp in relatedProducts"
        :key="rp.id"
        :href="`/product/${rp.slug}`"
        style="display:block;text-decoration:none;color:inherit;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff"
      >
        <div style="position:relative;aspect-ratio:1;background:#f7f8fa">
          <span
            v-if="rp.on_sale"
            style="position:absolute;top:10px;left:10px;background:#fed7d7;color:#c53030;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;z-index:1"
          >
            Sale
          </span>
          <img
            v-if="rp.images?.[0]"
            :src="rp.images[0].src"
            :alt="rp.images[0].alt || rp.name"
            style="width:100%;height:100%;object-fit:cover;display:block"
          />
          <div v-else style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#a0aec0;font-size:13px">
            No image
          </div>
        </div>
        <div style="padding:14px">
          <p v-if="rp.categories?.[0]" style="margin:0 0 4px;font-size:11px;color:#a0aec0;text-transform:uppercase;letter-spacing:0.03em">{{ rp.categories[0].name }}</p>
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a202c;line-height:1.3">{{ rp.name }}</p>
          <div style="display:flex;align-items:baseline;gap:8px">
            <span :style="{ fontSize:'14px', fontWeight:700, color: rp.on_sale ? '#c53030' : '#1a202c' }">{{ relatedPrice(rp) }}</span>
            <span v-if="rp.on_sale && rp.regular_price" style="font-size:12px;color:#a0aec0;text-decoration:line-through">
              {{ product!.currency_symbol }} {{ parseFloat(rp.regular_price).toFixed(2) }}
            </span>
          </div>
        </div>
      </a>
    </div>
  </section>
</template>
