<script setup lang="ts">
// Vue twin of studio-app's BobgoShippingOptions.tsx ("Shipping Options (Bob
// Go)" block). Rebuilt 2026-08-28 — this file previously had NO real
// implementation: a hardcoded three-fake-option placeholder (Standard/
// Express/Collection at made-up prices) with a completely different prop
// shape than the real component, no rate fetching, no event dispatch — Bob
// Go shipping never actually calculated on the live storefront. Rebuilt
// following the same pattern already working in ShippingOptions.vue (the
// provider-agnostic twin), adapted for Bob Go's endpoints/field names.
//
// Listens for the SAME provider-agnostic 'shipping:address-changed' /
// 'shipping:cart-changed' events ShippingOptions.vue does — not a
// 'bobgo:*'-prefixed pair. The real React component had this exact bug
// (listening for events nothing ever dispatched, so it could never receive
// a live address), fixed in the same session this Vue port was written —
// see BobgoShippingOptions.tsx's own comment. Only the *outbound* events
// (bobgo:rate-selected / bobgo:pickup-selected) stay Bob-Go-prefixed, since
// BobgoPickupSelector.vue / BobgoShippingSummary.vue need to know which
// provider's rate shape to expect.

const props = defineProps<{
  apiUrl?:           string
  storeId?:          string
  showCourierNames?: boolean
  showEstDelivery?:  boolean
  loadingStyle?:     'skeleton' | 'spinner'
  fallbackMessage?:  string
  accentColor?:      string
  cardRadius?:       number
  backgroundColor?:  string
}>()

interface BobgoRate {
  display_name?:          string
  service_level?:         { code: string; name: string }
  courier?:               { name: string }
  rate_including_vat?:    number
  rate_excluding_vat?:    number
  estimated_delivery_date?: string
  delivery_days?:         number
  is_pickup_point?:       boolean
  is_free_shipping?:      boolean
  type?:                  'door' | 'pickup'
  level_id?:              number
  pickup_points?:         unknown[]
}

type State = 'idle' | 'loading' | 'loaded' | 'error' | 'no_rates'

const accentColor     = computed(() => props.accentColor || '#0e7490')
const cardRadius      = computed(() => props.cardRadius ?? 10)
const backgroundColor = computed(() => props.backgroundColor || 'transparent')
const loadingStyle    = computed(() => props.loadingStyle || 'skeleton')
const fallbackMessage = computed(() => props.fallbackMessage || 'Shipping calculated at order completion.')

const state    = ref<State>('idle')
const rates    = ref<BobgoRate[]>([])
const selected = ref<BobgoRate | null>(null)
const error    = ref('')
const sessionToken = ref('')

function getSessionToken(): string {
  if (typeof window === 'undefined') return ''
  const key = 'bobgo_session_token'
  let token = localStorage.getItem(key) ?? ''
  if (!/^[0-9a-f]{32}$/.test(token)) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(key, token)
  }
  return token
}

function formatZAR(amount: number): string {
  return amount === 0 ? 'FREE' : `R ${amount.toFixed(2)}`
}

async function fetchRates(detail: Record<string, unknown>) {
  if (!props.apiUrl || !props.storeId) return
  const address = detail.address as Record<string, string> | undefined
  if (!address?.postal_code) return

  state.value = 'loading'
  selected.value = null
  try {
    const token = sessionToken.value || getSessionToken()
    sessionToken.value = token

    const res  = await fetch(`${props.apiUrl.replace(/\/$/, '')}/bobgo_checkout/rates`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id:         props.storeId,
        session_token:    token,
        delivery_address: address,
        cart_items:       (detail.cartItems as unknown[]) ?? [],
      }),
    })
    const data = await res.json()

    if (res.status === 429) { state.value = 'error'; error.value = 'Too many requests — please wait a moment.'; return }
    if (!res.ok || data.error) { state.value = 'error'; error.value = data.error || 'Could not load shipping options.'; return }

    if (data.session_token) {
      sessionToken.value = data.session_token
      localStorage.setItem('bobgo_session_token', data.session_token)
    }

    const list: BobgoRate[] = data.rates ?? []
    rates.value = list
    state.value = list.length ? 'loaded' : 'no_rates'
  } catch {
    state.value = 'error'
    error.value = 'Could not connect to shipping service.'
  }
}

function onAddressOrCartChanged(e: Event) {
  fetchRates((e as CustomEvent).detail ?? {})
}

onMounted(() => {
  sessionToken.value = getSessionToken()
  document.addEventListener('shipping:address-changed', onAddressOrCartChanged)
  document.addEventListener('shipping:cart-changed',   onAddressOrCartChanged)
})
onBeforeUnmount(() => {
  document.removeEventListener('shipping:address-changed', onAddressOrCartChanged)
  document.removeEventListener('shipping:cart-changed',   onAddressOrCartChanged)
})

function selectRate(rate: BobgoRate) {
  selected.value = rate
  document.dispatchEvent(new CustomEvent('bobgo:rate-selected', {
    bubbles: true,
    detail: {
      rate,
      pickup_points:   rate.pickup_points ?? [],
      is_pickup_point: !!(rate.is_pickup_point || rate.type === 'pickup'),
      session_token:   sessionToken.value,
      store_id:        props.storeId,
    },
  }))

  if (props.apiUrl) {
    fetch(`${props.apiUrl.replace(/\/$/, '')}/bobgo_checkout/select_rate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: props.storeId, session_token: sessionToken.value, rate, pickup_point: null }),
    }).catch(() => {})
  }
}

function isPickupRate(rate: BobgoRate) { return !!(rate.is_pickup_point || rate.type === 'pickup') }
function rateIcon(rate: BobgoRate) {
  const cost = rate.rate_including_vat ?? 0
  const isFree = cost === 0 || rate.is_free_shipping
  if (isFree) return '🎁'
  if (isPickupRate(rate)) return '📦'
  if (rate.delivery_days === 1) return '⚡'
  return '🚚'
}
function rateName(rate: BobgoRate) { return rate.display_name || rate.service_level?.name || 'Delivery' }
function rateMeta(rate: BobgoRate) {
  const courier = props.showCourierNames !== false ? (rate.courier?.name ?? '') : ''
  const eta = props.showEstDelivery !== false && rate.estimated_delivery_date
    ? `Est. ${rate.estimated_delivery_date}`
    : (props.showEstDelivery !== false && rate.delivery_days
        ? `${rate.delivery_days} day${rate.delivery_days !== 1 ? 's' : ''}` : '')
  return [courier, eta].filter(Boolean).join(' · ')
}
function isSelected(rate: BobgoRate) { return selected.value === rate }
</script>

<template>
  <div :style="{ backgroundColor, padding: '16px', borderRadius: state === 'idle' ? `${cardRadius}px` : undefined }">
    <template v-if="state === 'idle'">
      <p v-if="!apiUrl" style="color:#9ca3af;font-size:13px;margin:0;text-align:center;padding:24px 0">
        🚚 Configure API URL in widget settings to enable live shipping rates.
      </p>
      <p v-else style="color:#9ca3af;font-size:13px;margin:0;text-align:center;padding:16px 0">
        🚚 Enter your delivery address to see shipping options.
      </p>
    </template>

    <template v-else-if="state === 'loading'">
      <div v-if="loadingStyle === 'spinner'" style="display:flex;align-items:center;gap:10px;color:#6b7280;font-size:13px">
        <span class="bso-spinner" :style="{ borderTopColor: accentColor }" />
        Loading shipping options…
      </div>
      <div v-else>
        <div v-for="(w, i) in [60, 45, 50]" :key="i" class="bso-skeleton-card">
          <div style="flex:1">
            <div class="bso-skeleton-bar" :style="{ width: `${w}%`, marginBottom: '6px' }" />
            <div class="bso-skeleton-bar" style="width:35%;height:10px" />
          </div>
          <div class="bso-skeleton-bar" style="width:60px" />
        </div>
      </div>
    </template>

    <div v-else-if="state === 'error'" style="padding:14px 16px;background:#fef9c3;border:1px solid #fde047;color:#78350f;font-size:13px" :style="{ borderRadius: `${cardRadius}px` }">
      {{ error || fallbackMessage }}
    </div>

    <div v-else-if="state === 'no_rates'" style="padding:14px 16px;background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;font-size:13px" :style="{ borderRadius: `${cardRadius}px` }">
      We don't currently ship to your area.
    </div>

    <template v-else>
      <div
        v-for="(rate, i) in rates" :key="i"
        role="radio" tabindex="0" :aria-checked="isSelected(rate)"
        class="bso-card"
        :style="{
          borderRadius: `${cardRadius}px`,
          borderColor: isSelected(rate) ? accentColor : '#e5e7eb',
          background:  isSelected(rate) ? `${accentColor}14` : '#fff',
          boxShadow:   isSelected(rate) ? `0 0 0 3px ${accentColor}22` : 'none',
        }"
        @click="selectRate(rate)"
        @keydown.enter="selectRate(rate)" @keydown.space.prevent="selectRate(rate)"
      >
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          <span class="bso-dot" :style="{ borderColor: isSelected(rate) ? accentColor : '#d1d5db', background: isSelected(rate) ? accentColor : '#fff' }" />
          <div style="display:flex;flex-direction:column;min-width:0">
            <span style="font-weight:600;font-size:14px;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              {{ rateIcon(rate) }} {{ rateName(rate) }}
            </span>
            <span v-if="rateMeta(rate) || isPickupRate(rate)" style="font-size:12px;color:#6b7280;margin-top:2px">
              {{ rateMeta(rate) }}
              <span v-if="isPickupRate(rate)" :style="{ color: accentColor, fontWeight: 500 }"> › Select pickup point</span>
            </span>
          </div>
        </div>
        <div style="margin-left:12px;white-space:nowrap">
          <span v-if="(rate.rate_including_vat ?? 0) === 0 || rate.is_free_shipping" style="font-weight:700;font-size:13px;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px">FREE</span>
          <span v-else style="font-weight:700;font-size:15px;color:#1f2937">{{ formatZAR(rate.rate_including_vat ?? 0) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bso-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border: 1.5px solid #e5e7eb; margin-bottom: 8px;
  cursor: pointer; background: #fff; transition: border-color 0.15s, background 0.15s;
  user-select: none;
}
.bso-dot {
  flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid #d1d5db; background: #fff; transition: all 0.15s;
}
.bso-spinner {
  width: 20px; height: 20px; border: 2.5px solid #e5e7eb; border-top-color: #0e7490;
  border-radius: 50%; animation: bso-spin 0.7s linear infinite; flex-shrink: 0; display: inline-block;
}
@keyframes bso-spin { to { transform: rotate(360deg); } }
.bso-skeleton-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border: 1.5px solid #e5e7eb; border-radius: 10px; margin-bottom: 8px;
}
.bso-skeleton-bar {
  height: 13px; border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%; animation: bso-shimmer 1.4s infinite;
}
@keyframes bso-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
