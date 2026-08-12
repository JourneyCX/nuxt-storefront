<script setup lang="ts">
import type { WcCheckoutPayload, WcOrder } from '~/server/utils/woocommerce'

const { cart, cartLoading, fetchCart } = useCart()
// The courier/rate choice is now made on /cart (before any contact/billing
// details exist -- see docs on that page), not here. quoteAddress carries
// the city/postcode/country/state already given there so this page doesn't
// ask twice.
const { quoteAddress, selectedRate } = useShippingQuote()

const cartNeedsShipping = computed(() => cart.value?.needs_shipping ?? false)

onMounted(async () => {
  await fetchCart()
  // Landed here directly (no /cart visit this session, or a hard refresh
  // that dropped the in-memory selection) with a cart that still needs a
  // courier choice -- bounce back to /cart rather than let placeOrder()
  // submit with no shipping resolved.
  if (cartNeedsShipping.value && !selectedRate.value) {
    navigateTo('/cart')
  }
})

// Matches server/api/orders/[id].get.ts's OrderConfirmation exactly (the
// REST v3-backed, guest-safe order lookup originally built for the PayFast
// return flow) -- reused here for the COD confirmation screen too, since
// the Store API checkout response itself doesn't actually carry total/
// currency/payment_method_title (see WcOrder's docblock).
interface OrderConfirmation {
  id: number
  status: string
  currency: string
  total: string
  firstName: string
  email: string
  paymentMethodTitle: string
}

const order   = ref<OrderConfirmation | null>(null)
const orderCurrencySymbol = ref('')
const loading = ref(false)
const error   = ref('')

// city/state/postcode/country come pre-filled from the /cart page's
// quoteAddress (already used to fetch the selected courier rate) and are
// shown read-only below -- editing them here without re-quoting would
// silently desync the displayed total from what the courier actually
// charges, so a shopper who wants a different delivery address goes back to
// /cart instead (see the redirect guard above and Edit link in the template).
const form = reactive({
  first_name: '',
  last_name:  '',
  email:      '',
  phone:      '',
  address_1:  '',
  city:       quoteAddress.city,
  state:      quoteAddress.state,
  postcode:   quoteAddress.postcode,
  country:    quoteAddress.country,
})

const provinceOptions = computed(() => STATE_OPTIONS[form.country] ?? null)

// Discount/coupon amounts were already applied to the real cart on /cart --
// cart.totals below already reflects them, same as total_shipping does for
// a woocommerce_native rate.
const discountMinor = computed(() => parseFloat(cart.value?.totals.total_discount ?? '0') || 0)

const shippingResolved = computed(() => !cartNeedsShipping.value || !!selectedRate.value)

// Native rates already land in cart.totals.total_shipping (mutated on
// /cart's onSelectRate()); external providers never touch that cart, so
// their price is shown from the selection carried over from /cart instead.
const shippingDisplayPrice = computed(() => {
  if (!selectedRate.value) return null
  if (selectedRate.value.provider === 'woocommerce_native') return cart.value?.totals.total_shipping ?? null
  return (selectedRate.value.price * 100).toFixed(0) // match the minor-unit string formatPrice() expects
})

// cart.totals.total_price is NOT a safe "products only" base -- WooCommerce
// auto-selects a default shipping-zone rate against the store's base address
// the moment the cart needs shipping, so total_price can already carry an
// estimated shipping cost unrelated to what's actually being charged. Sum
// the line items directly instead so Subtotal is always products-only.
const cartSubtotal = computed(() => {
  const items = cart.value?.items ?? []
  return items.reduce((sum, item) => sum + parseFloat(item.prices.price) * item.quantity, 0)
})

// Total = products subtotal − discount + shipping. The real, authoritative
// total is still confirmed by placeOrder()'s order.total after
// shipping-attach.post.ts patches the actual WC order for external providers.
const displayTotal = computed(() => {
  const base = cartSubtotal.value - discountMinor.value
  if (!cartNeedsShipping.value || !selectedRate.value) return String(base)
  const minorUnit = cart.value?.totals.currency_minor_unit ?? 2
  const shippingMinor = selectedRate.value.provider === 'woocommerce_native'
    ? parseFloat(cart.value?.totals.total_shipping ?? '0')
    : Math.round(selectedRate.value.price * 10 ** minorUnit)
  return String(base + shippingMinor)
})

// ── Payment method ────────────────────────────────────────────────────────
// Driven by cart.payment_methods (the Store API's live view of which
// gateways are actually enabled+available right now), not a hardcoded list --
// a store with only COD configured sees just COD, exactly as before; a store
// with PayFast configured (Store Builder ▸ Payment) sees both. Unknown
// gateway ids (anything without copy below) are filtered out rather than
// shown with a blank label.
const paymentMethodMeta: Record<string, { label: string; description: string }> = {
  cod: {
    label: 'Cash on Delivery',
    description: 'Pay when your order is delivered. Additional delivery fees may apply.',
  },
  payfast: {
    label: 'Card / EFT (PayFast)',
    description: 'Pay securely online via PayFast. You’ll be redirected to complete payment, then brought back here.',
  },
}
const availablePaymentMethods = computed(() => {
  const methods = cart.value?.payment_methods?.filter(m => paymentMethodMeta[m]) ?? []
  return methods.length ? methods : ['cod']
})
const selectedPaymentMethod = ref('cod')
watch(availablePaymentMethods, (methods) => {
  if (!methods.includes(selectedPaymentMethod.value)) {
    selectedPaymentMethod.value = methods[0] ?? 'cod'
  }
}, { immediate: true })

// WooCommerce's Store API checkout endpoint rejects the order outright with
// "Province is required" if the destination country defines a state list
// and state is blank -- confirmed live. /cart's own canProceed already
// enforces this before a shopper ever reaches this page (see
// provinceResolved there), so this is a safety net, not the primary gate.
const canSubmit = computed(() =>
  form.first_name && form.last_name && form.email &&
  form.address_1  &&
  // city/state/postcode/country only ever get populated (from quoteAddress,
  // via /cart's delivery step) when cartNeedsShipping is true -- /cart's own
  // Delivery Options section is gated on that same flag, so a cart WC
  // reports as not needing shipping (e.g. no shipping zones configured at
  // all for the store, confirmed live for tenant 80 -- WC_Cart::needs_shipping()
  // short-circuits to false when wc_get_shipping_method_count() is 0,
  // regardless of the product itself needing shipping) never gets asked for
  // them, so requiring them unconditionally here permanently disabled Place
  // Order for any such cart.
  (!cartNeedsShipping.value || (form.city && (!provinceOptions.value || form.state) && form.postcode && form.country)) &&
  (cart.value?.items_count ?? 0) > 0 &&
  shippingResolved.value
)

function formatPrice(amount: string | null | undefined, symbol: string) {
  if (amount == null) return `${symbol}0.00`
  return `${symbol}${(parseFloat(amount) / 100).toFixed(2)}`
}

async function placeOrder() {
  if (!canSubmit.value || loading.value) return
  loading.value = true
  error.value   = ''
  try {
    const payload: WcCheckoutPayload = {
      billing_address: {
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        phone:      form.phone,
        address_1:  form.address_1,
        city:       form.city,
        state:      form.state,
        postcode:   form.postcode,
        country:    form.country,
      },
      shipping_address: {
        first_name: form.first_name,
        last_name:  form.last_name,
        address_1:  form.address_1,
        city:       form.city,
        state:      form.state,
        postcode:   form.postcode,
        country:    form.country,
      },
      payment_method: selectedPaymentMethod.value,
    }
    // Captured before fetchCart() below empties the cart -- OrderConfirmation
    // has no currency symbol of its own (only a currency code), and this is
    // simpler and just as correct as a code->symbol lookup table.
    orderCurrencySymbol.value = cart.value?.totals.currency_symbol ?? ''

    const result = await $fetch<WcOrder>('/api/cart/checkout', {
      method: 'POST',
      body:   payload,
    })

    // Only an external-provider rate (Courier Guy/Bob Go) needs this -- a
    // woocommerce_native selection was already applied to the real cart on
    // /cart's onSelectRate(), so WC's own order creation already carries
    // it. Best-effort and non-blocking: the order already exists either way,
    // and the price attached comes from the server-persisted selection, not
    // anything resubmitted here (see shipping-attach.post.ts). The
    // confirmation fetch below picks up the post-attach total regardless of
    // whether this succeeds.
    if (selectedRate.value && selectedRate.value.provider !== 'woocommerce_native') {
      await $fetch('/api/cart/shipping-attach', {
        method: 'POST',
        body:   { order_id: result.order_id },
      }).catch(() => {})
    }

    // Off-site gateways (anything but COD) need the shopper's browser sent
    // to redirect_url (WooCommerce's "pay for order" page, which itself
    // auto-submits to PayFast) instead of showing the inline confirmation
    // below -- the order isn't actually paid yet at this point, only
    // created. COD's redirect_url is ignored entirely (unchanged from
    // before this gateway existed): its process_payment() completes
    // synchronously, so the inline confirmation is already correct.
    if (selectedPaymentMethod.value !== 'cod' && result.payment_result?.redirect_url) {
      window.location.href = result.payment_result.redirect_url
      return
    }

    // Re-fetch through REST v3 (order_key proves ownership) rather than
    // trusting the checkout response directly -- see WcOrder's docblock and
    // OrderConfirmation above. The order already exists and (for COD) is
    // already paid regardless of whether this lookup succeeds, so a failure
    // here falls back to a minimal confirmation built from what the
    // checkout response does reliably carry, rather than silently dropping
    // back to the order form and risking a shopper re-submitting.
    order.value = await $fetch<OrderConfirmation>(`/api/orders/${result.order_id}`, {
      query: { key: result.order_key },
    }).catch(() => ({
      id: result.order_id,
      status: result.status,
      currency: '',
      total: '',
      firstName: result.billing_address.first_name,
      email: result.billing_address.email,
      paymentMethodTitle: paymentMethodMeta[result.payment_method]?.label ?? result.payment_method,
    }))

    await fetchCart()
  } catch (err: unknown) {
    // e.data.statusMessage (not e.data.message) carries the real WooCommerce
    // validation reason -- confirmed live, see coupon.post.ts.
    const e = err as { data?: { statusMessage?: string; message?: string }; statusMessage?: string; message?: string }
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? e?.data?.message ?? e?.message ?? 'Order failed. Please try again.'
  } finally {
    loading.value = false
  }
}

useHead({ title: 'Checkout' })
</script>

<template>
  <!-- Order confirmation -->
  <div v-if="order" style="max-width:680px;margin:80px auto;padding:0 24px;text-align:center">
    <div style="font-size:56px;margin-bottom:16px">✅</div>
    <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 12px">Order Confirmed!</h1>
    <p style="font-size:16px;color:#4a5568;margin:0 0 8px">
      Thank you, <strong>{{ order.firstName }}</strong>. Your order <strong>#{{ order.id }}</strong> has been placed.
    </p>
    <p style="font-size:14px;color:#718096;margin:0 0 32px">
      A confirmation email will be sent to <strong>{{ order.email }}</strong>.
    </p>
    <div style="background:#f7f8fa;border-radius:12px;padding:24px;margin-bottom:32px;text-align:left">
      <div v-if="order.total" style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#718096">Order total</span>
        <strong style="color:#1a202c">{{ orderCurrencySymbol }}{{ order.total }}</strong>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:#718096">Payment</span>
        <span style="color:#1a202c">{{ order.paymentMethodTitle }}</span>
      </div>
    </div>
    <a href="/" style="display:inline-block;background:#2b6cb0;color:#fff;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px">
      Continue Shopping
    </a>
  </div>

  <!-- Checkout form -->
  <div v-else style="max-width:1100px;margin:0 auto;padding:48px 24px">
    <nav style="font-size:13px;color:#718096;margin-bottom:32px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <a href="/cart" style="color:#3182ce;text-decoration:none">Cart</a>
      <span style="margin:0 8px">›</span>
      <span>Checkout</span>
    </nav>

    <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 32px">Checkout</h1>

    <div style="display:grid;grid-template-columns:1fr 380px;gap:48px;align-items:start">

      <!-- Billing form -->
      <div>
        <h2 style="font-size:18px;font-weight:600;color:#2d3748;margin:0 0 20px">Billing &amp; Shipping Details</h2>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div>
            <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">
              First Name <span style="color:#e53e3e">*</span>
            </label>
            <input v-model="form.first_name" type="text" placeholder="Jane"
              style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">
              Last Name <span style="color:#e53e3e">*</span>
            </label>
            <input v-model="form.last_name" type="text" placeholder="Smith"
              style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div>
            <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">
              Email <span style="color:#e53e3e">*</span>
            </label>
            <input v-model="form.email" type="email" placeholder="jane@example.com"
              style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Phone</label>
            <input v-model="form.phone" type="tel" placeholder="+27 82 000 0000"
              style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
          </div>
        </div>

        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">
            Street Address <span style="color:#e53e3e">*</span>
          </label>
          <input v-model="form.address_1" type="text" placeholder="123 Main Road"
            style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
        </div>

        <div v-if="cartNeedsShipping" style="margin-bottom:28px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <label style="font-size:13px;font-weight:600;color:#4a5568">Delivery Address</label>
            <a href="/cart" style="font-size:12px;color:#3182ce;text-decoration:none">Change</a>
          </div>
          <div style="background:#f7f8fa;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;font-size:14px;color:#2d3748">
            {{ form.city }}{{ form.state ? `, ${provinceOptions?.[form.state] ?? form.state}` : '' }}, {{ form.postcode }}, {{ COUNTRY_OPTIONS.find(c => c.code === form.country)?.label ?? form.country }}
          </div>
          <p style="margin:6px 0 0;font-size:12px;color:#a0aec0">
            Set on the Cart page, used to quote your delivery option below. Go back to Cart to change it.
          </p>
        </div>

        <!-- Delivery (already chosen on /cart) -->
        <template v-if="cartNeedsShipping">
          <h2 style="font-size:18px;font-weight:600;color:#2d3748;margin:0 0 16px">Delivery</h2>
          <div v-if="selectedRate" style="display:flex;align-items:center;justify-content:space-between;border:1.5px solid #3182ce;background:#ebf4ff;border-radius:8px;padding:12px 16px;margin-bottom:24px">
            <span style="font-size:14px;color:#2d3748">
              {{ selectedRate.courier_name ? `${selectedRate.courier_name} — ` : '' }}{{ selectedRate.service_name }}
              <span v-if="selectedRate.eta_days" style="color:#a0aec0">({{ selectedRate.eta_days }} day{{ selectedRate.eta_days === 1 ? '' : 's' }})</span>
            </span>
            <strong style="font-size:14px;color:#2d3748">
              {{ formatPrice(shippingDisplayPrice, cart?.totals.currency_symbol ?? '') }}
            </strong>
          </div>
        </template>

        <!-- Payment method -->
        <h2 style="font-size:18px;font-weight:600;color:#2d3748;margin:0 0 16px">Payment</h2>
        <label v-for="method in availablePaymentMethods" :key="method"
          style="display:block;border:2px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;cursor:pointer"
          :style="{ borderColor: selectedPaymentMethod === method ? '#3182ce' : '#e2e8f0', background: selectedPaymentMethod === method ? '#ebf4ff' : '#fff' }">
          <span style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:#2b6cb0">
            <input type="radio" name="payment_method" :value="method" v-model="selectedPaymentMethod"
              style="width:16px;height:16px;accent-color:#3182ce" />
            {{ paymentMethodMeta[method]?.label ?? method }}
          </span>
          <p style="margin:8px 0 0 26px;font-size:13px;color:#4a5568">
            {{ paymentMethodMeta[method]?.description }}
          </p>
        </label>

        <div v-if="error" style="background:#fff5f5;border:1px solid #fed7d7;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#c53030;font-size:14px">
          {{ error }}
        </div>

        <button
          @click="placeOrder"
          :disabled="!canSubmit || loading || cartLoading"
          :style="{
            width: '100%', padding: '16px', background: canSubmit ? '#2b6cb0' : '#a0aec0',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '18px', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
          }"
        >
          {{ loading ? 'Placing Order…' : 'Place Order' }}
        </button>
      </div>

      <!-- Order summary -->
      <div style="background:#f7f8fa;border-radius:12px;padding:24px;position:sticky;top:24px">
        <h2 style="font-size:16px;font-weight:700;color:#1a202c;margin:0 0 16px">Order Summary</h2>

        <div v-if="cartLoading" style="text-align:center;padding:32px;color:#a0aec0;font-size:14px">
          Loading cart…
        </div>

        <div v-else-if="!cart || cart.items.length === 0" style="text-align:center;padding:24px;color:#a0aec0;font-size:14px">
          Your cart is empty. <a href="/" style="color:#3182ce">Shop now</a>
        </div>

        <div v-else>
          <div v-for="item in cart.items" :key="item.key"
            style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #e2e8f0">
            <img v-if="item.images?.[0]"
              :src="item.images[0].src" :alt="item.name"
              style="width:56px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0" />
            <div v-else style="width:56px;height:56px;background:#e2e8f0;border-radius:6px;flex-shrink:0" />
            <div style="flex:1;min-width:0">
              <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#2d3748;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                {{ item.name }}
              </p>
              <p style="margin:0;font-size:12px;color:#718096">Qty: {{ item.quantity }}</p>
            </div>
            <span style="font-size:13px;font-weight:700;color:#2d3748;white-space:nowrap;flex-shrink:0">
              {{ item.prices.currency_symbol }}{{ (parseFloat(item.prices.price) / 10 ** item.prices.currency_minor_unit).toFixed(2) }}
            </span>
          </div>

          <div style="display:flex;justify-content:space-between;padding-top:12px;font-size:13px;color:#4a5568">
            <span>Subtotal</span>
            <span>{{ formatPrice(String(cartSubtotal), cart.totals.currency_symbol) }}</span>
          </div>

          <div v-if="discountMinor > 0" style="display:flex;justify-content:space-between;padding-top:8px;font-size:13px;color:#276749">
            <span>Discount</span>
            <span>−{{ formatPrice(String(discountMinor), cart.totals.currency_symbol) }}</span>
          </div>

          <div v-if="cartNeedsShipping" style="display:flex;justify-content:space-between;padding-top:8px;font-size:13px;color:#4a5568">
            <span>Shipping</span>
            <span v-if="!selectedRate">Not available</span>
            <span v-else>{{ formatPrice(shippingDisplayPrice, cart.totals.currency_symbol) }}</span>
          </div>

          <div style="display:flex;justify-content:space-between;padding-top:16px">
            <span style="font-size:16px;font-weight:600;color:#1a202c">Total <span style="font-weight:400;font-size:12px;color:#a0aec0">(VAT Included)</span></span>
            <strong style="font-size:18px;color:#1a202c">
              {{ formatPrice(displayTotal, cart.totals.currency_symbol) }}
            </strong>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
