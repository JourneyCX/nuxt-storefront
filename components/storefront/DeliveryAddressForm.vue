<script setup lang="ts">
// Vue twin of studio-app's DeliveryAddressForm.tsx — see that file's header
// comment for why this widget exists (ShippingOptions/PickupSelector only
// listen for 'shipping:address-changed', nothing dispatched it before this).
//
// Unlike the React editor version (which has no real shopper cart to read
// and sends cartItems: []), this live twin pulls the shopper's actual cart
// via useCart() so ShippingOptions.vue's rate quote reflects real cart
// weight/value — same item-mapping cart.vue already uses for its own native
// shipping-rates call, adapted to Shipping_checkout.php's own snake_case
// { product_id, qty, unit_price } contract (this widget calls that endpoint
// directly from the browser, not through Nuxt's /api/cart proxy, so it must
// match the raw PHP contract rather than the proxy's camelCase input shape).

const props = defineProps<{
  headline?:        string
  accentColor?:     string
  backgroundColor?: string
}>()

const { cart } = useCart()

const address = reactive({
  street: '', suburb: '', city: '', province: '', postal_code: '', country: 'ZA',
})

const provinceOptions = computed(() => STATE_OPTIONS[address.country] ?? null)
watch(() => address.country, () => { address.province = '' })

let debounce: ReturnType<typeof setTimeout> | null = null

function dispatchChange() {
  if (typeof document === 'undefined') return
  const cartItems = (cart.value?.items ?? []).map(item => ({
    product_id: item.id,
    qty:        item.quantity,
    unit_price: parseFloat(item.prices.price) / 10 ** item.prices.currency_minor_unit,
  }))
  document.dispatchEvent(new CustomEvent('shipping:address-changed', {
    bubbles: true,
    detail: { address: { ...address }, cartItems },
  }))
}

watch(
  () => [address.street, address.city, address.province, address.postal_code, address.country],
  () => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(dispatchChange, 600)
  },
)
</script>

<template>
  <div :style="{ backgroundColor: backgroundColor || '#ffffff', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px' }">
    <h3 v-if="headline" :style="{ fontSize: '15px', fontWeight: 700, color: accentColor || '#1a202c', margin: '0 0 16px' }">{{ headline }}</h3>

    <div style="margin-bottom:12px">
      <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Street Address</label>
      <input v-model="address.street" type="text" placeholder="29 Poplar Rd"
        style="width:100%;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box" />
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">City</label>
        <input v-model="address.city" type="text" placeholder="Cape Town"
          style="width:100%;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box" />
      </div>
      <div>
        <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Postal Code</label>
        <input v-model="address.postal_code" type="text" placeholder="8001"
          style="width:100%;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box" />
      </div>
      <div>
        <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Country</label>
        <select v-model="address.country"
          style="width:100%;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;background:#fff;box-sizing:border-box">
          <option v-for="c in COUNTRY_OPTIONS" :key="c.code" :value="c.code">{{ c.label }}</option>
        </select>
      </div>
    </div>
    <div v-if="provinceOptions">
      <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Province</label>
      <select v-model="address.province"
        style="width:100%;max-width:280px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;background:#fff;box-sizing:border-box">
        <option value="">Select province</option>
        <option v-for="(label, code) in provinceOptions" :key="code" :value="code">{{ label }}</option>
      </select>
    </div>
    <div v-else>
      <label style="display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:6px">Province / State (optional)</label>
      <input v-model="address.province" type="text" placeholder="Western Cape"
        style="width:100%;max-width:280px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box" />
    </div>
  </div>
</template>
