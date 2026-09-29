<script setup lang="ts">
// Live-render counterpart of studio-app's Commerce/ProductAccordion.tsx --
// collapsible product-info sections (Description, Shipping information...),
// the accordion sibling of ProductTabs.vue. Self-fetches the real product by
// route slug exactly like ProductTabs.vue (no cross-widget "current product"
// context exists). Each section reads the product's description / short
// description, a Warehouse item Custom Field (meta_data 'cf_<slug>', see
// ProductTabs.vue), or fixed text that's the same on every product. A
// product-sourced section with no value for this product is omitted rather
// than shown empty.
import type { WcProduct } from '~/server/utils/woocommerce'

type SectionSource = 'description' | 'short_description' | 'custom_field' | 'static'
type SectionDef = {
  label: string
  source?: SectionSource
  fieldSlug?: string
  staticContent?: string
  openByDefault?: boolean
}
type IconStyle = 'plus-circle' | 'plus' | 'chevron'
type Alignment = 'left' | 'center' | 'right'

const props = withDefaults(defineProps<{
  sections?: SectionDef[]
  allowMultipleOpen?: boolean
  iconStyle?: IconStyle
  backgroundColor?: string
  textColor?: string
  accentColor?: string
  dividerColor?: string
  labelFontSize?: number
  maxWidth?: number
  alignment?: Alignment
}>(), {
  sections: () => [],
  allowMultipleOpen: true,
  iconStyle: 'plus-circle',
  backgroundColor: 'transparent',
  textColor: '#1a202c',
  accentColor: '#1e90c8',
  dividerColor: '#cbd5e0',
  labelFontSize: 24,
  maxWidth: 1200,
  alignment: 'center',
})

const ALIGNMENT_MARGIN: Record<Alignment, string> = {
  left:   '0 auto 0 0',
  center: '0 auto',
  right:  '0 0 0 auto',
}
const contentMargin = computed(() => ALIGNMENT_MARGIN[props.alignment] ?? ALIGNMENT_MARGIN.center)

const route = useRoute()
const slug  = route.params.slug as string | undefined
const hasSlug = !!slug

// Server-side relative $fetch doesn't carry the request's Host header -- see
// ProductDetail.vue's identical comment.
const requestFetch = useRequestFetch()

const { data: product } = await useAsyncData<WcProduct | null>(
  `product-accordion-${slug ?? 'none'}`,
  () => hasSlug ? requestFetch(`/api/products/${slug}`) : Promise.resolve(null),
  { server: true },
)

// Fixed text is typed in a plain textarea: escape it and keep its line breaks.
function plainTextToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/\r?\n/g, '<br>')
}

function sectionHtml(section: SectionDef, p: WcProduct): string {
  switch (section.source ?? 'custom_field') {
    case 'description':       return p.description ?? ''
    case 'short_description': return p.short_description ?? ''
    case 'static':            return plainTextToHtml(section.staticContent ?? '')
    default:
      return section.fieldSlug
        ? String(p.meta_data?.find(m => m.key === `cf_${section.fieldSlug}`)?.value ?? '')
        : ''
  }
}

const visibleSections = computed(() => {
  if (!product.value) return []
  return props.sections
    .map(section => ({
      label: section.label || 'Section',
      html: sectionHtml(section, product.value!),
      openByDefault: !!section.openByDefault,
    }))
    .filter(section => section.html.replace(/<[^>]*>/g, '').trim() !== '')
})

const openSet = ref<number[]>([])
watch(visibleSections, (list) => {
  const initial = list.flatMap((s, i) => (s.openByDefault ? [i] : []))
  openSet.value = props.allowMultipleOpen ? initial : initial.slice(0, 1)
}, { immediate: true })

function toggle(i: number) {
  if (openSet.value.includes(i)) openSet.value = openSet.value.filter(x => x !== i)
  else openSet.value = props.allowMultipleOpen ? [...openSet.value, i] : [i]
}
</script>

<template>
  <div v-if="!hasSlug" style="max-width:1200px;margin:0 auto;padding:48px 24px;border:2px dashed #cbd5e0;border-radius:12px;text-align:center;color:#a0aec0;font-size:14px">
    🗂️ Product Info Accordion — this block only shows real data on an actual product page
  </div>
  <section v-else-if="visibleSections.length > 0" :style="{ backgroundColor, padding: '24px' }">
    <div :style="{ maxWidth: `${maxWidth}px`, margin: contentMargin }">
      <div
        v-for="(section, i) in visibleSections" :key="i"
        :style="{ borderBottom: `1px solid ${dividerColor}` }"
      >
        <button
          type="button"
          class="pa-toggle"
          :aria-expanded="openSet.includes(i)"
          :aria-controls="`pa-panel-${i}`"
          @click="toggle(i)"
          :style="{ color: textColor }"
        >
          <h3 :style="{ margin: 0, fontSize: `${labelFontSize}px`, fontWeight: 600, color: textColor }">{{ section.label }}</h3>

          <svg
            v-if="iconStyle === 'chevron'"
            width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="accentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            :style="{ flexShrink: 0, transition: 'transform .25s', transform: openSet.includes(i) ? 'rotate(180deg)' : 'none' }"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span
            v-else
            class="pa-icon"
            :style="{ backgroundColor: iconStyle === 'plus-circle' ? accentColor : 'transparent' }"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              :stroke="iconStyle === 'plus-circle' ? '#ffffff' : accentColor" stroke-width="3" stroke-linecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <line v-if="!openSet.includes(i)" x1="12" y1="5" x2="12" y2="19" />
            </svg>
          </span>
        </button>

        <div :id="`pa-panel-${i}`" class="pa-panel" :class="{ 'pa-open': openSet.includes(i) }">
          <div class="pa-panel-inner">
            <div
              class="pa-body"
              :style="{ color: textColor, fontSize: '15px', lineHeight: 1.7 }"
              v-html="section.html"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pa-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
.pa-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
/* Smooth open/close without measuring heights: animate grid rows 0fr -> 1fr. */
.pa-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows .3s ease;
}
.pa-panel.pa-open {
  grid-template-rows: 1fr;
}
.pa-panel-inner {
  overflow: hidden;
  min-height: 0;
}
.pa-body {
  padding-bottom: 20px;
}
.pa-body :deep(ul),
.pa-body :deep(ol) {
  padding-left: 1.5em;
  margin: .75em 0;
}
.pa-body :deep(li) {
  list-style: disc;
  margin: .25em 0;
}
.pa-body :deep(ol li) {
  list-style: decimal;
}
.pa-body :deep(p) {
  margin: .75em 0;
}
.pa-body :deep(h1),
.pa-body :deep(h2),
.pa-body :deep(h3) {
  margin: .75em 0 .5em;
  line-height: 1.2;
}
</style>
