<script setup lang="ts">
import type { WcProduct } from '~/server/utils/woocommerce'
import type { PublishedCollectionDetail } from '~/server/utils/stratum'

// Pinned-prop shape, like ProductGrid's categorySlug -- NOT a route-slug
// self-fetch like ProductDetail.vue. This is what
// _sb_provision_collection_page() drops onto a collection's auto-provisioned
// page, and it can also be dragged onto any other page and pointed at any
// collection by hand via studio-app's CollectionSelectField picker.
const props = withDefaults(defineProps<{
  collectionSlug?: string
  columns?:        number
  backgroundColor?: string
}>(), {})

// useRequestFetch() (not plain $fetch) so this internal SSR call carries the
// original request's Host header -- see pages/product/[slug].vue for why.
const requestFetch = useRequestFetch()

// Keeps theme-preview context flowing into individual product links -- see
// composables/usePreviewThemeQuery.ts.
const { suffix: previewSuffix } = usePreviewThemeQuery()

const { data, pending, error } = await useAsyncData<{ collection: PublishedCollectionDetail; products: WcProduct[] } | null>(
  `collection-detail-${props.collectionSlug}`,
  () => props.collectionSlug
    ? requestFetch(`/api/collections/${props.collectionSlug}`).catch(() => null)
    : Promise.resolve(null),
  { default: () => null, watch: [() => props.collectionSlug] }
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
  <section :style="{ backgroundColor: backgroundColor || '#ffffff', padding: '48px 24px' }">
    <div :style="{ maxWidth: '1200px', margin: '0 auto' }">
      <!-- No collection pinned yet -->
      <div v-if="!collectionSlug" :style="{ border: '2px dashed #e2e8f0', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#a0aec0', fontSize: '14px' }">
        No collection selected.
      </div>

      <p v-else-if="pending" :style="{ fontSize: '13px', color: '#718096' }">Loading collection…</p>
      <p v-else-if="error || !data" :style="{ color: '#a0aec0', fontSize: '14px', padding: '32px', textAlign: 'center' }">Collection not found.</p>

      <template v-else>
        <h2 :style="{ margin: '0 0 8px', fontSize: '28px', fontWeight: 700, color: '#1a202c' }">{{ data.collection.name }}</h2>
        <p v-if="data.collection.description" :style="{ margin: '0 0 32px', fontSize: '15px', color: '#4a5568', maxWidth: '700px' }">
          {{ data.collection.description }}
        </p>

        <p v-if="data.products.length === 0" :style="{ color: '#a0aec0', fontSize: '14px', padding: '32px', textAlign: 'center' }">
          This collection has no products yet.
        </p>
        <!-- sb-grid (assets/css/responsive.css) collapses this to 1 column on mobile
             and 2 on tablet regardless of the merchant's chosen column count —
             desktop keeps whatever `columns` picks. Card markup mirrors
             ProductGrid.vue's real-product card exactly. -->
        <div v-else class="sb-grid" :style="{ display: 'grid', gridTemplateColumns: `repeat(${columns || 3}, 1fr)`, gap: '24px' }">
          <article
            v-for="product in data.products"
            :key="product.id"
            :style="{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }"
          >
            <a :href="`/product/${product.slug}${previewSuffix}`" :style="{ display: 'block' }">
              <div :style="{ aspectRatio: '1/1', overflow: 'hidden', background: '#f7f8fa' }">
                <img
                  v-if="product.images?.[0]"
                  :src="product.images[0].src"
                  :alt="product.images[0].alt || product.name"
                  :style="{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }"
                />
                <div v-else :style="{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0', fontSize: '13px' }">
                  No Image
                </div>
              </div>
            </a>
            <div :style="{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }">
              <a :href="`/product/${product.slug}${previewSuffix}`" :style="{ textDecoration: 'none' }">
                <p :style="{ margin: '0 0 6px', fontWeight: 600, fontSize: '15px', color: '#2d3748', lineHeight: 1.3 }">{{ product.name }}</p>
              </a>
              <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }">
                <span :style="{ fontWeight: 700, fontSize: '16px', color: product.on_sale ? '#c53030' : '#2d3748' }">
                  {{ price(product) }}
                </span>
                <a
                  :href="`/product/${product.slug}${previewSuffix}`"
                  :style="{ background: product.stock_status === 'instock' ? '#3182ce' : '#a0aec0', color: '#fff', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, pointerEvents: product.stock_status !== 'instock' ? 'none' : 'auto' }"
                >
                  {{ product.stock_status === 'instock' ? 'View Product' : 'Out of Stock' }}
                </a>
              </div>
            </div>
          </article>
        </div>
      </template>
    </div>
  </section>
</template>
