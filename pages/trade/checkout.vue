<script setup lang="ts">
// Trade checkout (B2B Session 5a). One button places the order, once: Stratum creates the order, takes the stock and issues
// the invoice in a single step, or refuses with a reason and leaves the cart as it was. The page sends back only the
// checkout token and the revision of the cart the buyer was looking at; if any price, quantity or delivery cost changed in
// between, Stratum orders nothing and answers with the new cart so the buyer can look again.
useHead({ title: 'Trade checkout', meta: [{ name: 'robots', content: 'noindex' }] })

const { me } = await useTrade()
if (!me.value.enabled) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const { view, busy, notice, loadError, act, money } = useTradeCart()
const token   = ref('')
const po      = ref('')
const note    = ref('')
const changes = ref<{ ref: string; type: string; was: string | null; now: string | null }[]>([])
const placing = ref(false)
const errorText = ref('')

async function start() {
  const r = await act({ action: 'prepare' })
  if (r.status === 200 && r.data?.success) { token.value = r.data.token; po.value = r.data.cart?.po_number ?? ''; note.value = r.data.cart?.note ?? '' }
  else loadError.value = notice.value || 'Your cart could not be loaded.'
}
await start()

async function saveDetails() {
  const r = await act({ action: 'details', po: po.value, note: note.value })
  if (r.status === 200 && r.data?.success) { /* the token was reset by the change */ const p = await act({ action: 'prepare' }); if (p.data?.token) token.value = p.data.token }
}
async function setLocation(e: Event) {
  await act({ action: 'location', locationId: Number((e.target as HTMLSelectElement).value) })
  const p = await act({ action: 'prepare' }); if (p.data?.token) token.value = p.data.token
}

const lineName = (refId: string) => view.value?.lines?.find((l: any) => String(l.line_id) === refId)?.name ?? 'An item'

// What the buyer is looking at, so a change behind their back is caught: the revision of the cart as last shown (never the
// revision at the moment of the click) and each line's price then. Stratum compares the revision again under the lock.
const lastKnown = (v: any) => ({ revision: String(v?.cart?.revision ?? ''), prices: Object.fromEntries((v?.lines ?? []).map((l: any) => [String(l.line_id), l.unit_excl ?? null])) })
function diffFrom(shown: { revision: string; prices: Record<string, string | null> }, now: any) {
  const out: { ref: string; type: string; was: string | null; now: string | null }[] = []
  const seen = new Set<string>()
  for (const l of now?.lines ?? []) {
    const id = String(l.line_id); seen.add(id)
    if (!(id in shown.prices)) out.push({ ref: id, type: 'new', was: null, now: l.unit_excl ?? null })
    else if (shown.prices[id] !== (l.unit_excl ?? null)) out.push({ ref: id, type: 'price', was: shown.prices[id], now: l.unit_excl ?? null })
  }
  for (const id of Object.keys(shown.prices)) if (!seen.has(id)) out.push({ ref: id, type: 'gone', was: shown.prices[id], now: null })
  return out
}

async function place() {
  if (placing.value || busy.value) return
  errorText.value = ''
  changes.value = []
  placing.value = true
  try {
    const shown = lastKnown(view.value)
    // A PO number or note typed since the last save is saved first (it resets the token). If that answer shows the cart is no
    // longer what the buyer was looking at, stop and show what changed instead of ordering.
    if (po.value !== (view.value?.cart?.po_number ?? '') || note.value !== (view.value?.cart?.note ?? '')) {
      await act({ action: 'details', po: po.value, note: note.value })
    }
    const p = await act({ action: 'prepare' })
    if (!(p.status === 200 && p.data?.success)) { errorText.value = notice.value; return }
    token.value = p.data.token
    if (p.data.cart.revision !== shown.revision) {
      changes.value = diffFrom(shown, p.data)
      errorText.value = 'Some prices or quantities changed since you last looked. Nothing was ordered. Please check the cart and order again.'
      return
    }
    const r = await act({ action: 'place', token: token.value, revision: shown.revision })
    if (r.status === 200 && r.data?.success) {
      await navigateTo(`/trade/order/${encodeURIComponent(r.data.order.order_number)}`, { external: true })
      return
    }
    if (r.data?.code === 'PRICE_CHANGED') {
      changes.value = r.data.changes ?? []
      const q = await act({ action: 'prepare' }); if (q.data?.token) token.value = q.data.token
    }
    errorText.value = String(r.data?.error || 'We could not place your order. Nothing was ordered; please try again.')
  } finally {
    placing.value = false
  }
}

const blockers = computed(() => ((view.value?.blockers ?? []) as string[]).filter(b => b !== 'EMPTY'))
const label = 'display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px'
const input = 'width:100%;padding:12px;border:1px solid #cbd5e0;border-radius:6px;font-size:15px;box-sizing:border-box'
</script>

<template>
  <div style="max-width:1000px;margin:32px auto;padding:0 16px" data-testid="trade-checkout">
    <h1 style="font-size:28px;margin:0 0 16px">Checkout</h1>
    <p v-if="loadError" role="alert" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px">{{ loadError }}</p>

    <template v-else-if="view">
      <div v-if="!view.lines.length" style="padding:32px 0;color:#718096">Your cart is empty. <NuxtLink to="/" style="color:#2b6cb0">Continue shopping</NuxtLink></div>
      <template v-else>
        <p v-if="errorText" role="alert" data-testid="checkout-error" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px;margin:0 0 16px">{{ errorText }}</p>
        <div v-if="changes.length" data-testid="checkout-changes" style="background:#fffaf0;border:1px solid #fbd38d;border-radius:6px;padding:10px 12px;margin:0 0 16px;font-size:14px">
          <strong>What changed:</strong>
          <ul style="margin:6px 0 0 18px">
            <li v-for="c in changes" :key="c.ref">
              <template v-if="c.type === 'price'">{{ lineName(c.ref) }}: price changed from {{ money(c.was) }} to {{ money(c.now) }}.</template>
              <template v-else-if="c.type === 'gone'">{{ lineName(c.ref) }} is no longer available.</template>
              <template v-else>{{ lineName(c.ref) }} was added at {{ money(c.now) }}.</template>
            </li>
          </ul>
          <p style="margin:8px 0 0">The cart below is up to date. Check it and place your order again.</p>
        </div>

        <div style="display:flex;gap:32px;flex-wrap:wrap">
          <div style="flex:1;min-width:300px">
            <div style="margin-bottom:16px">
              <label for="loc" :style="label">Deliver to</label>
              <select id="loc" :value="view.cart.location_id" :disabled="busy || placing" :style="input" @change="setLocation">
                <option v-for="loc in view.locations" :key="loc.id" :value="loc.id">{{ loc.label }}{{ loc.address ? ' - ' + loc.address : '' }}</option>
              </select>
            </div>
            <div style="margin-bottom:16px">
              <label for="po" :style="label">Purchase order number{{ view.po_required ? '' : ' (optional)' }}</label>
              <input id="po" v-model="po" type="text" maxlength="40" autocomplete="off" :style="input" @change="saveDetails" />
              <p v-if="blockers.includes('PO_REQUIRED')" style="color:#c53030;font-size:13px;margin:4px 0 0">A purchase order number is required.</p>
            </div>
            <div style="margin-bottom:16px">
              <label for="note" :style="label">Note for us (optional)</label>
              <textarea id="note" v-model="note" rows="3" maxlength="500" :style="input" @change="saveDetails" />
            </div>

            <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:14px" data-testid="payment-box">
              <template v-if="view.payment.basis === 'terms'">
                <strong>Payment: on account</strong><br />
                {{ view.payment.terms_name }}<template v-if="view.payment.due_date">. Your invoice will be due on {{ view.payment.due_date }}.</template>
              </template>
              <template v-else>
                <strong>Payment: prepayment (EFT)</strong><br />
                Your order is held until we receive payment.
                <div v-if="view.payment.bank_details" style="margin-top:8px;white-space:pre-line">{{ view.payment.bank_details }}</div>
                <div v-else style="margin-top:8px">We will send you our bank details after you order.</div>
              </template>
              <div v-if="view.delivery" style="margin-top:10px">
                <strong>{{ view.delivery.label }}:</strong>{{ ' ' }}
                <template v-if="view.delivery.charged">{{ money(view.delivery.fee_excl) }}{{ view.vat_applies ? ' excl. VAT' : '' }}</template><template v-else>free on this order</template><template v-if="view.delivery.lead_time">. Lead time: {{ view.delivery.lead_time }}.</template>
              </div>
            </div>
          </div>

          <div style="width:380px;max-width:100%">
            <div v-for="l in view.lines" :key="l.line_id" style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #edf2f7;font-size:14px">
              <div>{{ l.name }} <span style="color:#718096">× {{ l.pack_qty }}</span>
                <div v-for="(i, n) in l.issues" :key="n" style="color:#c53030;font-size:12px">{{ i.message }}</div></div>
              <div style="white-space:nowrap">{{ l.line_excl ? money(l.line_excl) : '' }}</div>
            </div>
            <table style="width:100%;font-size:15px;margin-top:8px" data-testid="checkout-totals">
              <tr><td style="padding:4px 0">{{ view.vat_applies ? 'Subtotal excl. VAT' : 'Subtotal' }}</td><td style="text-align:right">{{ money(view.totals.goods_excl) }}</td></tr>
              <tr v-if="Number(view.totals.delivery_excl) > 0"><td style="padding:4px 0">{{ view.delivery?.label || 'Delivery' }}{{ view.vat_applies ? ' excl. VAT' : '' }}</td><td style="text-align:right">{{ money(view.totals.delivery_excl) }}</td></tr>
              <tr v-if="view.vat_applies"><td style="padding:4px 0">{{ view.tax_label }}</td><td style="text-align:right">{{ money(view.totals.tax) }}</td></tr>
              <tr style="font-weight:700;font-size:18px"><td style="padding:10px 0;border-top:1px solid #e2e8f0">Total{{ view.vat_applies ? ' incl. VAT' : '' }}</td><td style="text-align:right;border-top:1px solid #e2e8f0">{{ money(view.totals.gross) }}</td></tr>
            </table>
            <p v-for="b in blockers.filter(x => x !== 'PO_REQUIRED')" :key="b" style="color:#c53030;font-size:13px;margin:6px 0">
              <template v-if="b === 'MINIMUM'">Minimum order {{ money(view.minimum.amount) }}: add {{ money(view.minimum.shortfall) }} more.</template>
              <template v-else-if="b === 'ON_HOLD' || b === 'COMPANY_STATUS'">Your account cannot order right now. Please contact us.</template>
              <template v-else-if="b === 'NO_LOCATION'">Choose where to deliver.</template>
              <template v-else>Some items need attention. <NuxtLink to="/trade/cart" external style="color:#c53030;text-decoration:underline">Go back to the cart</NuxtLink>.</template>
            </p>
            <button type="button" data-testid="place-order" :disabled="placing || busy || blockers.length > 0"
              style="width:100%;background:#2b6cb0;color:#fff;padding:14px;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer;margin-top:12px"
              :style="{ opacity: (placing || busy || blockers.length > 0) ? 0.6 : 1 }" @click="place">
              {{ placing ? 'Placing your order…' : 'Place order' }}
            </button>
            <p style="font-size:12px;color:#718096;margin:8px 0 0"><NuxtLink to="/trade/cart" external style="color:#718096">Back to the cart</NuxtLink></p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
