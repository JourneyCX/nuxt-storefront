<script setup lang="ts">
// Vue twin of studio-app's ShippingSummary.tsx ("Shipping Summary (Any
// Provider)" block) — see ShippingOptions.vue's header comment. Purely a
// listener: renders whatever rate/pickup point ShippingOptions.vue /
// PickupSelector.vue dispatched on the page, regardless of provider. No
// apiUrl/storeId of its own.

const props = defineProps<{
  showCourier?:     boolean
  showEta?:         boolean
  accentColor?:     string
  borderRadius?:    number
  backgroundColor?: string
}>()

interface ShippingRate {
  service_name?:    string
  price?:           number
  currency?:        string
  eta_days?:        number | null
  is_pickup_point?: boolean
  courier_name?:    string | null
  pickup_point_id?:          string
  pickup_point_name?:        string
  pickup_point_distance_km?: number | null
}
interface PickupPoint { name: string; address?: string; trading_hours?: string }

const accentColor     = computed(() => props.accentColor || '#0e7490')
const borderRadius    = computed(() => props.borderRadius ?? 10)
const backgroundColor = computed(() => props.backgroundColor || 'transparent')
const showCourier     = computed(() => props.showCourier !== false)
const showEta         = computed(() => props.showEta !== false)

const rate        = ref<ShippingRate | null>(null)
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
  document.addEventListener('shipping:rate-selected',   onRate)
  document.addEventListener('shipping:pickup-selected', onPickup)
})
onBeforeUnmount(() => {
  document.removeEventListener('shipping:rate-selected',   onRate)
  document.removeEventListener('shipping:pickup-selected', onPickup)
})

const resolvedPickupName = computed(() => rate.value?.pickup_point_name || pickupPoint.value?.name)
const isPickup  = computed(() => !!rate.value?.is_pickup_point)
const isFree    = computed(() => (rate.value?.price ?? 0) === 0)
const icon      = computed(() => isPickup.value ? '📦' : isFree.value ? '🎁' : '🚚')
const name      = computed(() => resolvedPickupName.value || rate.value?.service_name || 'Delivery')
const courier   = computed(() => showCourier.value && rate.value?.courier_name ? ` · ${rate.value.courier_name}` : '')
const eta       = computed(() => showEta.value && rate.value?.eta_days ? `${rate.value.eta_days} day${rate.value.eta_days !== 1 ? 's' : ''}` : '')
const hasResolvedPickup = computed(() => isPickup.value && !!(pickupPoint.value || rate.value?.pickup_point_id))

function priceLabel() {
  const cost = rate.value?.price ?? 0
  const currency = rate.value?.currency || 'ZAR'
  return currency === 'ZAR' ? `R ${cost.toFixed(2)}` : `${currency} ${cost.toFixed(2)}`
}
</script>

<template>
  <div :style="{ backgroundColor, padding: '16px' }">
    <div v-if="!rate" style="padding:14px 16px;border:1.5px dashed #d1d5db;color:#9ca3af;font-size:13px;text-align:center" :style="{ borderRadius: `${borderRadius}px` }">
      📦 Shipping summary will appear here after shopper selects a shipping option.
    </div>

    <div v-else style="padding:14px 16px;margin-top:8px" :style="{
      borderRadius: `${borderRadius}px`,
      border: hasResolvedPickup ? `1.5px solid ${accentColor}` : '1.5px solid #e5e7eb',
      background: hasResolvedPickup ? `${accentColor}14` : '#fff',
    }">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px">
        <span style="font-weight:600;color:#1f2937">{{ icon }} {{ name }}{{ courier }}</span>
        <span v-if="isFree" style="font-weight:700;font-size:13px;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px">FREE</span>
        <span v-else style="font-weight:700;font-size:15px;color:#1f2937">{{ priceLabel() }}</span>
      </div>

      <div v-if="pickupPoint" style="font-size:12px;color:#6b7280;margin-top:4px">
        {{ pickupPoint.name }}{{ pickupPoint.address ? `, ${pickupPoint.address}` : '' }}
        <span v-if="pickupPoint.trading_hours" style="color:#9ca3af"> · {{ pickupPoint.trading_hours }}</span>
      </div>
      <div v-else-if="rate.pickup_point_id" style="font-size:12px;color:#6b7280;margin-top:4px">
        {{ rate.pickup_point_distance_km != null ? `${rate.pickup_point_distance_km.toFixed(1)} km away` : '' }}
      </div>
      <div v-else-if="eta" style="font-size:12px;color:#6b7280;margin-top:3px">
        Estimated: {{ eta }}
      </div>
    </div>
  </div>
</template>
