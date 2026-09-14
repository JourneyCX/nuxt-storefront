<script setup lang="ts">
// Live-render counterpart of studio-app's Commerce/ProductTabs.tsx — reads
// the real product the same way storefront/ProductDetail.vue does (by the
// page's own URL slug) and resolves each configured tab's `fieldSlug`
// against that product's real WooCommerce meta_data, keyed 'cf_<slug>' by
// _sb_build_wc_product_data() (store_builder_sync_helper.php) from the
// matching Warehouse item Custom Field (Setup > Custom Fields, "belongs to"
// = Items). A tab whose field has no value on this product is simply
// omitted, not shown empty -- so different products can show a different
// SET of tabs, not just different text.
import type { WcProduct } from '~/server/utils/woocommerce'

type TabDef = { label: string; fieldSlug: string }

const props = withDefaults(defineProps<{
  tabs?: TabDef[]
  backgroundColor?: string
  textColor?: string
  accentColor?: string
  maxWidth?: number
}>(), {
  tabs: () => [],
  backgroundColor: '#ffffff',
  textColor: '#1a202c',
  accentColor: '#2b6cb0',
  maxWidth: 1200,
})

const route = useRoute()
const slug  = route.params.slug as string | undefined
const hasSlug = !!slug

// Server-side relative $fetch does not carry the original request's Host
// header -- see ProductDetail.vue's identical comment; same fix required
// here since this component self-fetches the product independently (no
// cross-widget "current product" context mechanism exists in this app).
const requestFetch = useRequestFetch()

const { data: product } = await useAsyncData<WcProduct | null>(
  `product-tabs-${slug ?? 'none'}`,
  () => hasSlug ? requestFetch(`/api/products/${slug}`) : Promise.resolve(null),
  { server: true },
)

const visibleTabs = computed(() => {
  if (!product.value) return []
  return props.tabs
    .map(tab => ({
      label: tab.label || 'Tab',
      value: product.value!.meta_data?.find(m => m.key === `cf_${tab.fieldSlug}`)?.value ?? '',
    }))
    .filter(tab => tab.value.trim() !== '')
})

const activeIndex = ref(0)
watch(visibleTabs, () => { activeIndex.value = 0 })
</script>

<template>
  <div v-if="!hasSlug" style="max-width:1200px;margin:0 auto;padding:48px 24px;border:2px dashed #cbd5e0;border-radius:12px;text-align:center;color:#a0aec0;font-size:14px">
    🗂️ Product Tabs — this block only shows real data on an actual product page
  </div>
  <section v-else-if="visibleTabs.length > 0" :style="{ backgroundColor, padding: '24px' }">
    <div :style="{ maxWidth: `${maxWidth}px`, margin: '0 auto' }">
      <div :style="{ display: 'flex', gap: '8px', borderBottom: `1px solid ${textColor}1a`, marginBottom: '24px', flexWrap: 'wrap' }">
        <button
          v-for="(tab, i) in visibleTabs" :key="i"
          @click="activeIndex = i"
          :style="{
            padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600,
            color: i === activeIndex ? accentColor : textColor,
            opacity: i === activeIndex ? 1 : 0.6,
            borderBottom: i === activeIndex ? `2px solid ${accentColor}` : '2px solid transparent',
            marginBottom: '-1px',
          }"
        >
          {{ tab.label }}
        </button>
      </div>
      <div
        v-if="visibleTabs[activeIndex]"
        :style="{ color: textColor, opacity: 0.85, fontSize: '15px', lineHeight: 1.7 }"
        v-html="visibleTabs[activeIndex].value"
      />
    </div>
  </section>
</template>
