<script setup lang="ts">
type LineItem = { label: string; description: string; unitPrice: number; unitLabel: string; min: number; max: number; defaultQty: number; step: number }

const props = defineProps<{
  headline?: string
  subheadline?: string
  currencySymbol?: string
  taxRate?: number
  showTax?: boolean
  discountPercent?: number
  showDiscount?: boolean
  ctaText?: string
  ctaUrl?: string
  noteText?: string
  accentColor?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  borderRadius?: number
  items?: LineItem[]
}>()

const items = computed(() => props.items || [])
const quantities = ref<Record<number, number>>(
  Object.fromEntries(items.value.map((item, i) => [i, item.defaultQty]))
)

function qtyFor(i: number) {
  const item = items.value[i]
  return quantities.value[i] ?? item?.defaultQty ?? 0
}

function setQty(i: number, val: number) {
  const item = items.value[i]
  if (!item) return
  quantities.value[i] = Math.min(item.max, Math.max(item.min, val))
}

const currencySymbol = computed(() => props.currencySymbol ?? 'R ')
const taxRate = computed(() => props.taxRate ?? 0)
const discountPercent = computed(() => props.discountPercent ?? 0)
const accentColor = computed(() => props.accentColor || '#2563eb')
const backgroundColor = computed(() => props.backgroundColor || '#f8fafc')
const cardColor = computed(() => props.cardColor || '#ffffff')
const textColor = computed(() => props.textColor || '#1e293b')
const borderRadius = computed(() => props.borderRadius ?? 16)

const subtotal = computed(() =>
  items.value.reduce((sum, item, i) => sum + item.unitPrice * qtyFor(i), 0)
)
const discountAmt = computed(() => subtotal.value * (discountPercent.value / 100))
const taxableAmount = computed(() => subtotal.value - discountAmt.value)
const taxAmt = computed(() => taxableAmount.value * (taxRate.value / 100))
const total = computed(() => taxableAmount.value + taxAmt.value)

function fmt(n: number) {
  return `${currencySymbol.value}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor, padding: '64px 24px' }">
    <div style="max-width:760px;margin:0 auto;">
      <div v-if="headline || subheadline" style="margin-bottom:36px;text-align:center;">
        <h2 v-if="headline" :style="{ color: textColor, fontSize: '32px', fontWeight: 800, margin: '0 0 12px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor, opacity: 0.65, fontSize: '17px', margin: 0, lineHeight: 1.65 }">{{ subheadline }}</p>
      </div>

      <div :style="{ backgroundColor: cardColor, borderRadius: borderRadius + 'px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #f1f5f9' }">
        <div>
          <div v-for="(item, i) in items" :key="i" style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 28px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;">
            <div style="flex:1;">
              <p :style="{ color: textColor, fontWeight: 600, fontSize: '15px', margin: '0 0 3px' }">{{ item.label }}</p>
              <p v-if="item.description" :style="{ color: textColor, opacity: 0.55, fontSize: '13px', margin: 0 }">{{ item.description }}</p>
              <p :style="{ color: accentColor, fontSize: '13px', margin: '4px 0 0', fontWeight: 600 }">{{ fmt(item.unitPrice) }} / {{ item.unitLabel }}</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button
                type="button"
                :disabled="qtyFor(i) <= item.min"
                @click="setQty(i, qtyFor(i) - item.step)"
                :style="{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: qtyFor(i) <= item.min ? 'not-allowed' : 'pointer', fontSize: '18px', color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qtyFor(i) <= item.min ? 0.4 : 1 }"
              >−</button>
              <input
                type="number"
                class="calc-inp"
                :value="qtyFor(i)"
                :min="item.min"
                :max="item.max"
                :step="item.step"
                @input="setQty(i, Number(($event.target as HTMLInputElement).value))"
                :style="{ width: '80px', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', textAlign: 'center', color: textColor, fontWeight: 700, outline: 'none', backgroundColor: '#fff' }"
              />
              <button
                type="button"
                :disabled="qtyFor(i) >= item.max"
                @click="setQty(i, qtyFor(i) + item.step)"
                :style="{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: qtyFor(i) >= item.max ? 'not-allowed' : 'pointer', fontSize: '18px', color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qtyFor(i) >= item.max ? 0.4 : 1 }"
              >+</button>
              <span :style="{ minWidth: '80px', textAlign: 'right', color: textColor, fontWeight: 700, fontSize: '15px' }">{{ fmt(item.unitPrice * qtyFor(i)) }}</span>
            </div>
          </div>
        </div>

        <div style="padding:20px 28px;background-color:#f8fafc;border-top:2px solid #e2e8f0;">
          <div style="display:flex;flex-direction:column;gap:10px;max-width:320px;margin-left:auto;">
            <div style="display:flex;justify-content:space-between;">
              <span :style="{ color: textColor, opacity: 0.65, fontSize: '14px' }">Subtotal</span>
              <span :style="{ color: textColor, fontSize: '14px' }">{{ fmt(subtotal) }}</span>
            </div>
            <div v-if="showDiscount && discountPercent > 0" style="display:flex;justify-content:space-between;">
              <span style="color:#10b981;font-size:14px;font-weight:600;">Discount ({{ discountPercent }}%)</span>
              <span style="color:#10b981;font-size:14px;font-weight:600;">−{{ fmt(discountAmt) }}</span>
            </div>
            <div v-if="showTax && taxRate > 0" style="display:flex;justify-content:space-between;">
              <span :style="{ color: textColor, opacity: 0.65, fontSize: '14px' }">Tax ({{ taxRate }}%)</span>
              <span :style="{ color: textColor, fontSize: '14px' }">{{ fmt(taxAmt) }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid #e2e8f0;">
              <span :style="{ color: textColor, fontSize: '18px', fontWeight: 800 }">Estimated Total</span>
              <span :style="{ color: accentColor, fontSize: '22px', fontWeight: 800 }">{{ fmt(total) }}</span>
            </div>
          </div>

          <div v-if="ctaText" style="margin-top:20px;text-align:right;">
            <a :href="ctaUrl || '#'" :style="{ display: 'inline-block', backgroundColor: accentColor, color: '#fff', padding: '13px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }">
              {{ ctaText }}
            </a>
          </div>
          <p v-if="noteText" :style="{ color: textColor, opacity: 0.45, fontSize: '12px', margin: '14px 0 0', textAlign: 'right' }">{{ noteText }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.calc-inp:focus {
  border-color: v-bind(accentColor) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, v-bind(accentColor) 13%, transparent);
}
</style>
