<script setup lang="ts">
// Vue twin of studio-app's ShippingOptions.tsx ("Shipping Options (Any
// Provider)" Puck block) — was entirely missing from StorefrontRenderer.vue's
// componentMap (rendered as "Unknown component" on any real page), same class
// of gap as AITool.vue before it got a real port. Talks to
// Shipping_checkout.php directly from the browser (not through Nuxt's own
// /api/cart proxy — this widget is meant to be droppable on any Puck content
// page, not just the native /cart flow), resolving whichever provider
// (Bob Go / The Courier Guy / WooCommerce-native) is active for apiUrl+storeId
// via Shipping_provider_factory server-side.

const props = defineProps<{
  apiUrl?:           string
  storeId?:          string
  // storeId (woo_store_id) is only unique within one tenant's own table --
  // tenantId disambiguates it server-side. See Store_builder_api::shipping_widget_config()
  // and Shipping_provider_factory::resolve_store_prefix().
  tenantId?:         string
  showCourierNames?: boolean
  showEstDelivery?:  boolean
  loadingStyle?:     'skeleton' | 'spinner'
  fallbackMessage?:  string
  accentColor?:      string
  cardRadius?:       number
  backgroundColor?:  string
}>()

interface ShippingRate {
  provider?:        string
  service_code?:    string
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

type State = 'idle' | 'loading' | 'loaded' | 'error' | 'no_rates'

const accentColor     = computed(() => props.accentColor || '#0e7490')
const cardRadius      = computed(() => props.cardRadius ?? 10)
const backgroundColor = computed(() => props.backgroundColor || 'transparent')
const loadingStyle    = computed(() => props.loadingStyle || 'skeleton')
const fallbackMessage = computed(() => props.fallbackMessage || 'Shipping calculated at order completion.')

const state    = ref<State>('idle')
const rates    = ref<ShippingRate[]>([])
const selected = ref<ShippingRate | null>(null)
const error    = ref('')
const sessionToken = ref('')
const lastPostal   = ref('')

function getSessionToken(): string {
  if (typeof window === 'undefined') return ''
  const key = 'shipping_session_token'
  let token = localStorage.getItem(key) ?? ''
  if (!/^[0-9a-f]{32}$/.test(token)) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(key, token)
  }
  return token
}

function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return 'FREE'
  return currency === 'ZAR' ? `R ${amount.toFixed(2)}` : `${currency} ${amount.toFixed(2)}`
}

async function fetchRates(detail: Record<string, unknown>) {
  if (!props.apiUrl || !props.storeId) return
  const address = detail.address as Record<string, string> | undefined
  if (!address?.postal_code) return
  lastPostal.value = address.postal_code

  state.value = 'loading'
  selected.value = null
  try {
    const token = sessionToken.value || getSessionToken()
    sessionToken.value = token

    const res  = await fetch(`${props.apiUrl.replace(/\/$/, '')}/shipping_checkout/rates`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id:         props.storeId,
        tenant_id:        props.tenantId,
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
      localStorage.setItem('shipping_session_token', data.session_token)
    }

    const list: ShippingRate[] = data.rates ?? []
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

function selectRate(rate: ShippingRate) {
  selected.value = rate
  document.dispatchEvent(new CustomEvent('shipping:rate-selected', {
    bubbles: true,
    detail: {
      rate,
      is_pickup_point: !!rate.is_pickup_point,
      session_token:   sessionToken.value,
      store_id:        props.storeId,
      tenant_id:       props.tenantId,
      postal_code:     lastPostal.value,
    },
  }))

  if (props.apiUrl) {
    fetch(`${props.apiUrl.replace(/\/$/, '')}/shipping_checkout/select_rate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: props.storeId, tenant_id: props.tenantId, session_token: sessionToken.value, rate }),
    }).catch(() => {})
  }
}

function rateIcon(rate: ShippingRate) {
  const cost = rate.price ?? 0
  if (cost === 0) return '🎁'
  if (rate.is_pickup_point) return '📦'
  if (rate.eta_days === 1) return '⚡'
  return '🚚'
}
function rateName(rate: ShippingRate) {
  const isResolvedPickup = !!rate.is_pickup_point && !!rate.pickup_point_id
  return (isResolvedPickup ? rate.pickup_point_name : rate.service_name) || 'Delivery'
}
function needsPickupPick(rate: ShippingRate) {
  return !!rate.is_pickup_point && !rate.pickup_point_id
}
function rateMeta(rate: ShippingRate) {
  const courier  = props.showCourierNames !== false ? (rate.courier_name ?? '') : ''
  const eta      = props.showEstDelivery !== false && rate.eta_days
    ? `${rate.eta_days} day${rate.eta_days !== 1 ? 's' : ''}` : ''
  const isResolvedPickup = !!rate.is_pickup_point && !!rate.pickup_point_id
  const distance = isResolvedPickup && rate.pickup_point_distance_km != null
    ? `${rate.pickup_point_distance_km.toFixed(1)} km` : ''
  return [courier, eta, distance].filter(Boolean).join(' · ')
}
function isSelected(rate: ShippingRate) { return selected.value === rate }
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
        <span class="so-spinner" :style="{ borderTopColor: accentColor }" />
        Loading shipping options…
      </div>
      <div v-else>
        <div v-for="(w, i) in [60, 45, 50]" :key="i" class="so-skeleton-card">
          <div style="flex:1">
            <div class="so-skeleton-bar" :style="{ width: `${w}%`, marginBottom: '6px' }" />
            <div class="so-skeleton-bar" style="width:35%;height:10px" />
          </div>
          <div class="so-skeleton-bar" style="width:60px" />
        </div>
      </div>
    </template>

    <div v-else-if="state === 'error'" style="padding:14px 16px;background:#fef9c3;border:1px solid #fde047;border-radius:10px;color:#78350f;font-size:13px" :style="{ borderRadius: `${cardRadius}px` }">
      {{ error || fallbackMessage }}
    </div>

    <div v-else-if="state === 'no_rates'" style="padding:14px 16px;background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;color:#991b1b;font-size:13px" :style="{ borderRadius: `${cardRadius}px` }">
      We don't currently ship to your area.
    </div>

    <template v-else>
      <div
        v-for="(rate, i) in rates" :key="i"
        role="radio" tabindex="0" :aria-checked="isSelected(rate)"
        class="so-card"
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
          <span class="so-dot" :style="{ borderColor: isSelected(rate) ? accentColor : '#d1d5db', background: isSelected(rate) ? accentColor : '#fff' }" />
          <div style="display:flex;flex-direction:column;min-width:0">
            <span style="font-weight:600;font-size:14px;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              {{ rateIcon(rate) }} {{ rateName(rate) }}
            </span>
            <span v-if="rateMeta(rate) || needsPickupPick(rate)" style="font-size:12px;color:#6b7280;margin-top:2px">
              {{ rateMeta(rate) }}
              <span v-if="needsPickupPick(rate)" :style="{ color: accentColor, fontWeight: 500 }"> › Select pickup point</span>
            </span>
          </div>
        </div>
        <div style="margin-left:12px;white-space:nowrap">
          <span v-if="(rate.price ?? 0) === 0" style="font-weight:700;font-size:13px;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px">FREE</span>
          <span v-else style="font-weight:700;font-size:15px;color:#1f2937">{{ formatPrice(rate.price ?? 0, rate.currency || 'ZAR') }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.so-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border: 1.5px solid #e5e7eb; margin-bottom: 8px;
  cursor: pointer; background: #fff; transition: border-color 0.15s, background 0.15s;
  user-select: none;
}
.so-dot {
  flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid #d1d5db; background: #fff; transition: all 0.15s;
}
.so-spinner {
  width: 20px; height: 20px; border: 2.5px solid #e5e7eb; border-top-color: #0e7490;
  border-radius: 50%; animation: so-spin 0.7s linear infinite; flex-shrink: 0; display: inline-block;
}
@keyframes so-spin { to { transform: rotate(360deg); } }
.so-skeleton-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border: 1.5px solid #e5e7eb; border-radius: 10px; margin-bottom: 8px;
}
.so-skeleton-bar {
  height: 13px; border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%; animation: so-shimmer 1.4s infinite;
}
@keyframes so-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
