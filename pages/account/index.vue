<script setup lang="ts">
import type { WcAddress } from '~/server/utils/woocommerce'

const { account, loading, error, fetchAccount, saveAddress, logout } = useAccount()

const checking = ref(true)
onMounted(async () => {
  await fetchAccount()
  checking.value = false
  if (!account.value) navigateTo('/login')
  else hydrateForm()
})

function blankAddress(): WcAddress {
  return { first_name: '', last_name: '', address_1: '', city: '', postcode: '', country: 'ZA', state: '' }
}

const billing        = reactive<WcAddress>(blankAddress())
const shipping        = reactive<WcAddress>(blankAddress())
const shipSameAsBilling = ref(true)
const saved           = ref(false)

// Populate the form from whatever's already saved once fetchAccount() resolves
// -- account.value is null until then, so this can't run any earlier.
function hydrateForm() {
  if (account.value?.billing) Object.assign(billing, account.value.billing)
  if (account.value?.shipping) {
    Object.assign(shipping, account.value.shipping)
    // Only treat as "same as billing" if there's genuinely no distinct
    // shipping address saved yet -- an existing shopper with two different
    // saved addresses shouldn't have their shipping silently overwritten by
    // billing the next time they open this page.
    shipSameAsBilling.value = !account.value.shipping.address_1
  }
}

const billingProvinceOptions  = computed(() => STATE_OPTIONS[billing.country] ?? null)
const shippingProvinceOptions = computed(() => STATE_OPTIONS[shipping.country] ?? null)
watch(() => billing.country, () => { billing.state = '' })
watch(() => shipping.country, () => { shipping.state = '' })

async function onSaveAddress() {
  saved.value = false
  const ok = await saveAddress({
    billing,
    shipping: shipSameAsBilling.value ? billing : shipping,
  })
  if (ok) saved.value = true
}

async function onLogout() {
  await logout()
  navigateTo('/')
}
</script>

<template>
  <div v-if="checking" style="max-width:680px;margin:80px auto;padding:0 24px;text-align:center;color:#718096">
    Loading…
  </div>

  <div v-else-if="account" style="max-width:680px;margin:0 auto;padding:48px 24px">
    <nav style="font-size:13px;color:#718096;margin-bottom:32px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <span>My Account</span>
    </nav>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0">My Account</h1>
      <button type="button" @click="onLogout"
        style="background:none;border:1px solid #e2e8f0;color:#4a5568;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">
        Log Out
      </button>
    </div>
    <p style="font-size:14px;color:#718096;margin:0 0 32px">
      {{ account.first_name }} {{ account.last_name }} · {{ account.email }}
    </p>

    <a href="/account/orders" style="display:inline-block;color:#3182ce;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:32px">
      View Order History →
    </a>

    <h2 style="font-size:18px;font-weight:600;color:#2d3748;margin:0 0 20px">Saved Address</h2>

    <div class="sb-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">First Name</label>
        <input v-model="billing.first_name" type="text"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Last Name</label>
        <input v-model="billing.last_name" type="text"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>
    </div>
    <div style="margin-bottom:16px">
      <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Phone</label>
      <input v-model="billing.phone" type="tel"
        style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
    </div>
    <div style="margin-bottom:16px">
      <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Street Address</label>
      <input v-model="billing.address_1" type="text"
        style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
    </div>
    <div class="sb-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">City</label>
        <input v-model="billing.city" type="text"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Postal Code</label>
        <input v-model="billing.postcode" type="text"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Country</label>
        <select v-model="billing.country"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;background:#fff;box-sizing:border-box">
          <option v-for="c in COUNTRY_OPTIONS" :key="c.code" :value="c.code">{{ c.label }}</option>
        </select>
      </div>
    </div>
    <div v-if="billingProvinceOptions" style="margin-bottom:24px">
      <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Province</label>
      <select v-model="billing.state"
        style="width:100%;max-width:280px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;background:#fff;box-sizing:border-box">
        <option value="">Select province</option>
        <option v-for="(label, code) in billingProvinceOptions" :key="code" :value="code">{{ label }}</option>
      </select>
    </div>

    <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4a5568;margin-bottom:24px;cursor:pointer">
      <input v-model="shipSameAsBilling" type="checkbox" />
      Shipping address is the same as billing
    </label>

    <template v-if="!shipSameAsBilling">
      <h3 style="font-size:15px;font-weight:600;color:#2d3748;margin:0 0 16px">Shipping Address</h3>
      <div class="sb-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">First Name</label>
          <input v-model="shipping.first_name" type="text"
            style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Last Name</label>
          <input v-model="shipping.last_name" type="text"
            style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
        </div>
      </div>
      <div style="margin-bottom:16px">
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Street Address</label>
        <input v-model="shipping.address_1" type="text"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>
      <div class="sb-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">City</label>
          <input v-model="shipping.city" type="text"
            style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Postal Code</label>
          <input v-model="shipping.postcode" type="text"
            style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Country</label>
          <select v-model="shipping.country"
            style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;background:#fff;box-sizing:border-box">
            <option v-for="c in COUNTRY_OPTIONS" :key="c.code" :value="c.code">{{ c.label }}</option>
          </select>
        </div>
      </div>
      <div v-if="shippingProvinceOptions" style="margin-bottom:24px">
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Province</label>
        <select v-model="shipping.state"
          style="width:100%;max-width:280px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;background:#fff;box-sizing:border-box">
          <option value="">Select province</option>
          <option v-for="(label, code) in shippingProvinceOptions" :key="code" :value="code">{{ label }}</option>
        </select>
      </div>
    </template>

    <p v-if="error" style="color:#e53e3e;font-size:13px;margin:0 0 16px">{{ error }}</p>
    <p v-if="saved" style="color:#2f855a;font-size:13px;margin:0 0 16px">Address saved.</p>

    <button type="button" @click="onSaveAddress" :disabled="loading"
      style="background:#2b6cb0;color:#fff;padding:14px 32px;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer">
      {{ loading ? 'Saving…' : 'Save Address' }}
    </button>
  </div>
</template>
