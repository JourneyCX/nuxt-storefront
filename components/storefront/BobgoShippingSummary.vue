<script setup lang="ts">
// Vue twin of studio-app's BobgoShippingSummary.tsx ("Shipping Summary (Bob
// Go)" block). Rebuilt 2026-08-28 — this file previously had NO real
// implementation: hardcoded "Standard Delivery / 3-5 business days / R 65"
// text with a completely different prop shape than the real component, no
// event listening at all. Purely a listener, same as ShippingSummary.vue —
// renders whatever rate/pickup point BobgoShippingOptions.vue /
// BobgoPickupSelector.vue dispatched on the page.

const props = defineProps<{
  showCourier?:     boolean
  showEta?:         boolean
  accentColor?:     string
  borderRadius?:    number
  backgroundColor?: string
}>()

interface BobgoRate {
  display_name?:          string
  service_level?:         { name: string }
  courier?:               { name: string }
  rate_including_vat?:    number
  estimated_delivery_date?: string
  is_free_shipping?:      boolean
  is_pickup_point?:       boolean
  type?:                  'door' | 'pickup'
}

interface PickupPoint {
  name:             string
  address?:         string
  operating_hours?: string
}

const accentColor     = computed(() => props.accentColor || '#0e7490')
const borderRadius    = computed(() => props.borderRadius ?? 10)
const backgroundColor = computed(() => props.backgroundColor || 'transparent')
const showCourier     = computed(() => props.showCourier !== false)
const showEta         = computed(() => props.showEta !== false)

const rate        = ref<BobgoRate | null>(null)
const pickupPoint = ref<PickupPoint | null>(null)

function onRate(e: Event) {
  const detail = (e as CustomEvent).detail ?? {}
  rate.value = detail.rate ?? null
  pickupPoint.value = null
}
function onPickup(e: Event) {
  const detail = (e as CustomEvent).detail ?? {}
  pickupPoint.value = detail.pickup_point ?? null
}

onMounted(() => {
  document.addEventListener('bobgo:rate-selected',   onRate)
  document.addEventListener('bobgo:pickup-selected', onPickup)
})
onBeforeUnmount(() => {
  document.removeEventListener('bobgo:rate-selected',   onRate)
  document.removeEventListener('bobgo:pickup-selected', onPickup)
})

const isPickup  = computed(() => !!rate.value && !!(rate.value.is_pickup_point || rate.value.type === 'pickup'))
const isFree    = computed(() => (rate.value?.rate_including_vat ?? 0) === 0 || !!rate.value?.is_free_shipping)
const icon      = computed(() => isPickup.value ? '📦' : isFree.value ? '🎁' : '🚚')
const name      = computed(() => rate.value?.display_name || rate.value?.service_level?.name || 'Delivery')
const courier   = computed(() => showCourier.value && rate.value?.courier?.name ? ` · ${rate.value.courier.name}` : '')
const eta       = computed(() => showEta.value && rate.value?.estimated_delivery_date ? rate.value.estimated_delivery_date : '')

function priceLabel() {
  const cost = rate.value?.rate_including_vat ?? 0
  return `R ${cost.toFixed(2)}`
}
</script>

<template>
  <div :style="{ backgroundColor, padding: '16px' }">
    <div v-if="!rate" style="padding:14px 16px;border:1.5px dashed #d1d5db;color:#9ca3af;font-size:13px;text-align:center" :style="{ borderRadius: `${borderRadius}px` }">
      📦 Shipping summary will appear here after shopper selects a shipping option.
    </div>

    <div v-else style="padding:14px 16px;margin-top:8px" :style="{
      borderRadius: `${borderRadius}px`,
      border: isPickup && pickupPoint ? `1.5px solid ${accentColor}` : '1.5px solid #e5e7eb',
      background: isPickup && pickupPoint ? `${accentColor}14` : '#fff',
    }">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px">
        <span style="font-weight:600;color:#1f2937">{{ icon }} {{ name }}{{ courier }}</span>
        <span v-if="isFree" style="font-weight:700;font-size:13px;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px">FREE</span>
        <span v-else style="font-weight:700;font-size:15px;color:#1f2937">{{ priceLabel() }}</span>
      </div>

      <div v-if="isPickup && pickupPoint" style="font-size:12px;color:#6b7280;margin-top:4px">
        {{ pickupPoint.name }}{{ pickupPoint.address ? `, ${pickupPoint.address}` : '' }}
        <span v-if="pickupPoint.operating_hours" style="color:#9ca3af"> · {{ pickupPoint.operating_hours }}</span>
      </div>
      <div v-else-if="eta" style="font-size:12px;color:#6b7280;margin-top:3px">
        Estimated: {{ eta }}
      </div>
    </div>
  </div>
</template>
