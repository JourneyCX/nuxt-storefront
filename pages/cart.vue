<script setup lang="ts">
import type { ShippingCheckoutRate, ShippingCheckoutRatesResponse } from '~/server/utils/stratum'

const {
  cart, cartLoading, itemCount, fetchCart,
  removeFromCart, updateQuantity,
  couponLoading, couponError, applyCoupon, removeCoupon,
} = useCart()
const { quoteAddress, selectedRate, selectRate } = useShippingQuote()

onMounted(async () => {
  await fetchCart()
  // quoteAddress can already be populated (e.g. the shopper went /cart →
  // /checkout → back to /cart to change something) -- the debounced watch
  // below only fires on a CHANGE to these fields, so re-visiting with them
  // already filled would otherwise leave shippingRates empty and strand a
  // real selectedRate with no matching radio rendered. Kick off one lookup
  // directly for that case.
  if (cartNeedsShipping.value && quoteAddressComplete()) fetchShippingRates()
})

function formatPrice(amountMinor: string | number | null | undefined, symbol: string, minorUnit: number) {
  if (amountMinor == null) return `${symbol}0.00`
  return `${symbol}${(Number(amountMinor) / 10 ** minorUnit).toFixed(2)}`
}

// cart.totals.total_price is NOT a safe "products only" base -- WooCommerce
// auto-selects a default shipping-zone rate against the store's base address
// the moment the cart needs shipping, well before a real destination is
// known here. Sum the line items directly so Subtotal is always
// products-only. Same reasoning as checkout.vue's cartSubtotal.
const cartSubtotal = computed(() => {
  const items = cart.value?.items ?? []
  return items.reduce((sum, item) => sum + parseFloat(item.prices.price) * item.quantity, 0)
})

const discountMinor = computed(() => parseFloat(cart.value?.totals.total_discount ?? '0') || 0)

// ── Coupon ───────────────────────────────────────────────────────────────
const couponCode = ref('')
async function onApplyCoupon() {
  if (!couponCode.value.trim()) return
  const ok = await applyCoupon(couponCode.value.trim())
  if (ok) couponCode.value = ''
}

// ── Shipping quote (real Bob Go / Courier Guy / WC-native rates) ──────────
// Same provider-agnostic endpoint checkout.vue used to use for this --
// moved here so the shopper picks a courier before ever reaching the
// contact/payment step. Only city + postcode + country are required by
// server/api/cart/shipping-rates.post.ts; street address and province are
// optional refinements.
//
// NOT cart.value?.needs_shipping -- that's WooCommerce's own native-zones
// flag, which server/api/cart/shipping-rates.post.ts doesn't even use (it
// calls Stratum's provider-agnostic shipping_checkout/rates endpoint
// instead, resolving whichever of Courier Guy/Bob Go/WC-native is actually
// active for the tenant). WC's flag is false whenever the store has zero
// *native* shipping zones/methods, regardless of the item itself needing
// shipping or an external provider being fully configured and working --
// confirmed live for tenant 80 (Courier Guy active with real credentials,
// WC zones empty): needs_shipping was false and this Delivery Options
// section never appeared, even though a real courier rate was one request
// away. Every product in this app is physical warehouse-tracked stock (no
// digital/virtual product story anywhere in this codebase), so "cart has
// items" is the correct proxy for "a delivery decision is needed."
const cartNeedsShipping = computed(() => itemCount.value > 0)

const shippingLoading = ref(false)
const shippingChecked = ref(false)
const shippingRates   = ref<ShippingCheckoutRate[]>([])

const provinceOptions = computed(() => STATE_OPTIONS[quoteAddress.country] ?? null)
watch(() => quoteAddress.country, () => { quoteAddress.state = '' })

function rateKey(rate: ShippingCheckoutRate) { return `${rate.provider}:${rate.service_code}` }

// address_1 wasn't required here before, but Courier_guy_provider.php hard-
// requires delivery_address.street and returns a zero-rates error without
// it -- confirmed live: "No delivery options are available" for a real,
// otherwise-complete address, because this page never even collected a
// street value to send (quoteAddress.address_1 existed in state and was
// already sent in fetchShippingRates()'s payload below, just never bound to
// an input). Bob Go/WC-native don't hard-require it, but requiring it
// uniformly here is more correct for an accurate quote either way.
function quoteAddressComplete() {
  return !!(quoteAddress.address_1 && quoteAddress.city && quoteAddress.postcode && quoteAddress.country)
}

let shippingDebounce: ReturnType<typeof setTimeout> | null = null

async function fetchShippingRates() {
  if (!quoteAddressComplete() || itemCount.value === 0) return
  shippingLoading.value = true
  shippingChecked.value = false
  try {
    const cartItems = (cart.value?.items ?? []).map(item => ({
      productId: item.id,
      quantity:  item.quantity,
      unitPrice: parseFloat(item.prices.price) / 10 ** item.prices.currency_minor_unit,
    }))

    const result = await $fetch<ShippingCheckoutRatesResponse>('/api/cart/shipping-rates', {
      method: 'POST',
      body: {
        shipping_address: {
          first_name: 'Shopper',
          last_name:  '',
          address_1:  quoteAddress.address_1,
          city:       quoteAddress.city,
          state:      quoteAddress.state,
          postcode:   quoteAddress.postcode,
          country:    quoteAddress.country,
        },
        cart_items: cartItems,
      },
    })
    shippingRates.value = result.rates ?? []

    if (shippingRates.value.length === 1) {
      await onSelectRate(shippingRates.value[0])
    } else if (!shippingRates.value.some(r => selectedRate.value && rateKey(r) === rateKey(selectedRate.value))) {
      selectRate(null)
    }
  } catch {
    shippingRates.value = []
    selectRate(null)
  } finally {
    shippingChecked.value = true
    shippingLoading.value = false
  }
}

async function onSelectRate(rate: ShippingCheckoutRate) {
  shippingLoading.value = true
  try {
    // Persisted server-side regardless of provider -- shipping-attach.post.ts
    // (run after order creation) re-reads this for external providers.
    await $fetch('/api/cart/shipping-select', { method: 'POST', body: { rate } }).catch(() => {})

    // Only a woocommerce_native rate has a real WC package/rate behind it --
    // apply it to the shopper's actual cart so WC's own totals already
    // carry it. External providers (Courier Guy/Bob Go) have no WC rate to
    // select; their cost is attached to the order after checkout instead.
    if (rate.provider === 'woocommerce_native' && rate.package_id !== undefined) {
      await $fetch('/api/cart/shipping-rate', {
        method: 'POST',
        body: { package_id: rate.package_id, rate_id: rate.service_code },
      })
      await fetchCart()
    }

    // quoteAddress is the shared useShippingQuote() singleton itself (not a
    // local copy) -- the v-model bindings above already mutate it in place,
    // so /checkout picks up the same values with no extra handoff step.
    selectRate(rate)
  } finally {
    shippingLoading.value = false
  }
}

watch(
  () => [quoteAddress.address_1, quoteAddress.city, quoteAddress.state, quoteAddress.postcode, quoteAddress.country],
  () => {
    if (shippingDebounce) clearTimeout(shippingDebounce)
    shippingChecked.value = false
    shippingDebounce = setTimeout(fetchShippingRates, 700)
  }
)

// Native rates already land in cart.totals.total_shipping (mutated in
// onSelectRate() above); external providers never touch that cart, so their
// price is shown from the local selection instead.
const shippingDisplayMinor = computed(() => {
  if (!selectedRate.value) return null
  if (selectedRate.value.provider === 'woocommerce_native') return Number(cart.value?.totals.total_shipping ?? 0)
  const minorUnit = cart.value?.totals.currency_minor_unit ?? 2
  return Math.round(selectedRate.value.price * 10 ** minorUnit)
})

// WooCommerce's Store API rejects the order at final submit with "Province
// is required" if the destination country defines a state list and none was
// given (confirmed live -- see checkout.vue) -- required here too, not just
// at the courier-quote step, so a shopper never reaches checkout only to
// discover they're blocked with no field left to fix it (that field only
// exists on this page now).
const provinceResolved = computed(() => !provinceOptions.value || !!quoteAddress.state)

const shippingResolved = computed(() =>
  !cartNeedsShipping.value || (shippingChecked.value && !!selectedRate.value && provinceResolved.value)
)

const displayTotal = computed(() => {
  const base = cartSubtotal.value - discountMinor.value
  if (!cartNeedsShipping.value || !selectedRate.value) return base
  return base + (shippingDisplayMinor.value ?? 0)
})

const canProceed = computed(() => itemCount.value > 0 && shippingResolved.value)

function proceedToCheckout() {
  if (!canProceed.value) return
  navigateTo('/checkout')
}

useHead({ title: 'Your Cart' })
</script>

<template>
  <div style="max-width:900px;margin:0 auto;padding:48px 24px">
    <nav style="font-size:13px;color:#718096;margin-bottom:24px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <span>Cart</span>
    </nav>

    <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 32px">
      Shopping Cart
      <span v-if="itemCount" style="font-size:16px;font-weight:400;color:#718096">({{ itemCount }})</span>
    </h1>

    <div v-if="cartLoading && !cart" style="text-align:center;padding:64px;color:#a0aec0">Loading cart…</div>

    <div v-else-if="!cart || cart.items.length === 0" style="text-align:center;padding:64px;color:#a0aec0">
      <div style="font-size:48px;margin-bottom:16px">🛒</div>
      <p style="margin:0 0 20px;font-size:16px">Your cart is empty</p>
      <a href="/" style="display:inline-block;background:#2b6cb0;color:#fff;padding:12px 28px;border-radius:6px;font-weight:700;text-decoration:none">Continue Shopping</a>
    </div>

    <template v-else>
      <!-- Items -->
      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px">
        <div v-for="item in cart.items" :key="item.key"
          style="display:flex;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid #f0f0f0">
          <img v-if="item.images?.[0]" :src="item.images[0].src" :alt="item.images[0].alt || item.name"
            style="width:64px;height:64px;object-fit:cover;border-radius:6px;flex-shrink:0" />
          <div v-else style="width:64px;height:64px;background:#f7f8fa;border-radius:6px;flex-shrink:0" />

          <div style="flex:1;min-width:0">
            <p style="margin:0 0 4px;font-weight:600;font-size:14px;color:#2d3748">{{ item.name }}</p>
            <p style="margin:0;font-size:13px;color:#718096">
              {{ formatPrice(item.prices.price, item.prices.currency_symbol, item.prices.currency_minor_unit) }} each
            </p>
          </div>

          <div style="display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:6px;flex-shrink:0">
            <button @click="updateQuantity(item.key, item.quantity - 1)" :disabled="cartLoading"
              style="width:32px;height:32px;border:none;background:none;cursor:pointer;font-size:16px;color:#4a5568">−</button>
            <span style="width:32px;text-align:center;font-size:14px;color:#2d3748">{{ item.quantity }}</span>
            <button @click="updateQuantity(item.key, item.quantity + 1)" :disabled="cartLoading"
              style="width:32px;height:32px;border:none;background:none;cursor:pointer;font-size:16px;color:#4a5568">+</button>
          </div>

          <strong style="width:80px;text-align:right;font-size:14px;color:#2d3748;flex-shrink:0">
            {{ formatPrice(parseFloat(item.prices.price) * item.quantity, item.prices.currency_symbol, item.prices.currency_minor_unit) }}
          </strong>

          <button @click="removeFromCart(item.key)" title="Remove"
            style="background:none;border:none;color:#a0aec0;cursor:pointer;font-size:18px;flex-shrink:0">×</button>
        </div>

        <div style="display:flex;justify-content:space-between;padding:16px 20px;background:#f7f8fa">
          <span style="font-weight:600;font-size:15px;color:#1a202c">Subtotal</span>
          <span style="font-weight:700;font-size:16px;color:#1a202c">
            {{ formatPrice(cartSubtotal, cart.totals.currency_symbol, cart.totals.currency_minor_unit) }}
          </span>
        </div>
      </div>

      <!-- Discount code -->
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px">
        <h2 style="font-size:15px;font-weight:700;color:#1a202c;margin:0 0 12px">Discount Code</h2>

        <div v-if="cart.coupons?.length" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
          <div v-for="c in cart.coupons" :key="c.code"
            style="display:flex;align-items:center;justify-content:space-between;background:#f0fff4;border:1px solid #c6f6d5;border-radius:6px;padding:10px 14px">
            <span style="font-size:13px;color:#276749;font-weight:600">{{ c.code.toUpperCase() }} applied</span>
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:13px;color:#276749">
                −{{ formatPrice(c.totals.total_discount, cart.totals.currency_symbol, cart.totals.currency_minor_unit) }}
              </span>
              <button @click="removeCoupon(c.code)" :disabled="couponLoading"
                style="background:none;border:none;color:#a0aec0;cursor:pointer;font-size:16px">×</button>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:10px">
          <input v-model="couponCode" type="text" placeholder="Enter coupon code" @keyup.enter="onApplyCoupon"
            style="flex:1;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
          <button @click="onApplyCoupon" :disabled="couponLoading || !couponCode.trim()"
            style="padding:10px 20px;background:#4a5568;color:#fff;border:none;border-radius:6px;font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap">
            {{ couponLoading ? 'Applying…' : 'Apply' }}
          </button>
        </div>
        <p v-if="couponError" style="margin:8px 0 0;font-size:13px;color:#c53030">{{ couponError }}</p>
      </div>

      <!-- Delivery options -->
      <div v-if="cartNeedsShipping" style="border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px">
        <h2 style="font-size:15px;font-weight:700;color:#1a202c;margin:0 0 16px">🚚 Delivery Options</h2>

        <div style="margin-bottom:16px">
          <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Street Address *</label>
          <input v-model="quoteAddress.address_1" type="text" placeholder="29 Poplar Rd"
            style="width:100%;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">City *</label>
            <input v-model="quoteAddress.city" type="text" placeholder="Cape Town"
              style="width:100%;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Postal Code *</label>
            <input v-model="quoteAddress.postcode" type="text" placeholder="8001"
              style="width:100%;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Country *</label>
            <select v-model="quoteAddress.country"
              style="width:100%;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;background:#fff;box-sizing:border-box">
              <option v-for="c in COUNTRY_OPTIONS" :key="c.code" :value="c.code">{{ c.label }}</option>
            </select>
          </div>
        </div>
        <div v-if="provinceOptions" style="margin-bottom:16px">
          <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Province *</label>
          <select v-model="quoteAddress.state"
            style="width:100%;max-width:280px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;background:#fff;box-sizing:border-box">
            <option value="">Select province</option>
            <option v-for="(label, code) in provinceOptions" :key="code" :value="code">{{ label }}</option>
          </select>
          <p style="margin:6px 0 0;font-size:11px;color:#a0aec0">Required at checkout -- pick it now so you're not asked again.</p>
        </div>

        <div v-if="!quoteAddressComplete()" style="font-size:13px;color:#a0aec0">
          Enter your street address, city, postal code, and country above to see delivery options.
        </div>
        <div v-else-if="shippingLoading" style="font-size:13px;color:#718096">Calculating delivery options…</div>
        <div v-else-if="shippingChecked && shippingRates.length === 0"
          style="background:#fff5f5;border:1px solid #fed7d7;border-radius:8px;padding:14px 16px;color:#c53030;font-size:13px">
          No delivery options are available for this address. Please contact us or try a different address.
        </div>
        <div v-else-if="shippingRates.length">
          <label v-for="rate in shippingRates" :key="rateKey(rate)"
            style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:8px;cursor:pointer"
            :style="{ borderColor: selectedRate && rateKey(selectedRate) === rateKey(rate) ? '#3182ce' : '#e2e8f0', background: selectedRate && rateKey(selectedRate) === rateKey(rate) ? '#ebf4ff' : '#fff' }">
            <span style="display:flex;align-items:center;gap:10px;font-size:14px">
              <input type="radio" name="delivery_rate" :checked="!!selectedRate && rateKey(selectedRate) === rateKey(rate)"
                @change="onSelectRate(rate)" style="width:16px;height:16px" />
              {{ rate.courier_name ? `${rate.courier_name} — ` : '' }}{{ rate.service_name }}
              <span v-if="rate.eta_days" style="color:#a0aec0">({{ rate.eta_days }} day{{ rate.eta_days === 1 ? '' : 's' }})</span>
            </span>
            <strong style="font-size:14px;color:#2d3748">
              {{ rate.price === 0 ? 'FREE' : `${cart.totals.currency_symbol}${rate.price.toFixed(2)}` }}
            </strong>
          </label>
        </div>
      </div>

      <!-- Total + proceed -->
      <div style="border-top:2px solid #1a202c;padding-top:16px">
        <div v-if="discountMinor > 0" style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;color:#276749">
          <span>Discount</span>
          <span>−{{ formatPrice(discountMinor, cart.totals.currency_symbol, cart.totals.currency_minor_unit) }}</span>
        </div>
        <div v-if="cartNeedsShipping" style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;color:#4a5568">
          <span>Delivery</span>
          <span v-if="!selectedRate">Select an option above</span>
          <span v-else>{{ formatPrice(shippingDisplayMinor, cart.totals.currency_symbol, cart.totals.currency_minor_unit) }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:20px">
          <span style="font-size:18px;font-weight:700;color:#1a202c">Total</span>
          <strong style="font-size:22px;color:#1a202c">
            {{ formatPrice(displayTotal, cart.totals.currency_symbol, cart.totals.currency_minor_unit) }}
          </strong>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button
            @click="proceedToCheckout"
            :disabled="!canProceed"
            :style="{ flex:'1 1 240px', padding:'16px', background: canProceed ? '#2b6cb0' : '#a0aec0', color:'#fff', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:700, cursor: canProceed ? 'pointer' : 'not-allowed' }"
          >
            Proceed to Checkout
          </button>
          <a href="/" style="flex:0 0 auto;padding:16px 28px;border:1px solid #e2e8f0;border-radius:8px;color:#2d3748;text-decoration:none;font-weight:600;font-size:15px;text-align:center">
            Continue Shopping
          </a>
        </div>
        <p v-if="cartNeedsShipping && !selectedRate" style="margin:10px 0 0;font-size:12px;color:#a0aec0">
          Select a delivery option above to continue to checkout.
        </p>
        <p v-else-if="cartNeedsShipping && !provinceResolved" style="margin:10px 0 0;font-size:12px;color:#a0aec0">
          Select your province above to continue to checkout.
        </p>
      </div>
    </template>
  </div>
</template>
