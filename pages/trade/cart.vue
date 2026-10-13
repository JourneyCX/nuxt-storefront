<script setup lang="ts">
// Trade cart (B2B Session 5a). Stratum prices every line, applies the quantity rules and works out delivery and VAT; this page
// only shows its answer and sends the buyer's changes back. A buyer who is not signed in, or a store without trade ordering,
// never gets here (server/middleware/trade.ts sends them to the sign-in page).
useHead({ title: 'Your trade cart', meta: [{ name: 'robots', content: 'noindex' }] })

const { me } = await useTrade()
if (!me.value.enabled) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const { view, busy, notice, loadError, load, act, money } = useTradeCart()
await load(true)

// What the buyer typed in a quantity box, by line, until they leave the box.
const typed = reactive<Record<number, string>>({})
async function setQty(l: any) {
  const raw = typed[l.line_id]
  delete typed[l.line_id]
  if (raw === undefined || Number(raw) === l.pack_qty) return
  await act({ action: 'update', lineId: l.line_id, qty: Number(raw) || 0 })
}
async function remove(l: any) { await act({ action: 'remove', lineId: l.line_id }) }
async function setLocation(e: Event) { await act({ action: 'location', locationId: Number((e.target as HTMLSelectElement).value) }) }

const blockers = computed(() => (view.value?.blockers ?? []) as string[])
const reasons: Record<string, string> = {
  EMPTY: 'Your cart is empty.',
  UNAVAILABLE: 'Some products are not available. Remove them to continue.',
  QTY_RULE: 'Some quantities do not meet the ordering rules.',
  STOCK: 'Some products are not available in the quantity you asked for.',
  NO_LOCATION: 'Choose where to deliver.',
  MINIMUM: 'The minimum order has not been reached.',
  ON_HOLD: 'Your account is on hold, so you cannot order right now. Please contact us.',
  COMPANY_STATUS: 'Your account cannot order right now. Please contact us.',
}
const showable = computed(() => blockers.value.filter(b => b !== 'PO_REQUIRED' && b !== 'EMPTY'))
const cell = 'padding:12px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:14px'
const right = cell + ';text-align:right;white-space:nowrap'
</script>

<template>
  <div style="max-width:1000px;margin:32px auto;padding:0 16px" data-testid="trade-cart">
    <h1 style="font-size:28px;margin:0 0 16px">Your trade cart</h1>

    <p v-if="loadError" role="alert" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px">{{ loadError }}</p>

    <template v-else-if="view">
      <p v-if="notice" role="alert" data-testid="cart-notice" style="background:#fffaf0;border:1px solid #fbd38d;color:#7b341e;border-radius:6px;padding:10px 12px;margin:0 0 16px">{{ notice }}</p>

      <div v-if="!view.lines.length" style="padding:40px 0;text-align:center;color:#718096">
        <p style="font-size:18px">Your cart is empty.</p>
        <NuxtLink to="/" style="color:#2b6cb0">Continue shopping</NuxtLink>
      </div>

      <template v-else>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="text-align:left;font-size:12px;text-transform:uppercase;color:#718096">
                <th style="padding:8px">Product</th>
                <th style="padding:8px;text-align:right">Price{{ view.vat_applies ? ' excl. VAT' : '' }}</th>
                <th style="padding:8px;text-align:right">Quantity</th>
                <th style="padding:8px;text-align:right">Total{{ view.vat_applies ? ' excl. VAT' : '' }}</th>
                <th style="padding:8px" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in view.lines" :key="l.line_id" :data-testid="`line-${l.item_id}`">
                <td :style="cell">
                  <div style="display:flex;gap:12px">
                    <img v-if="l.image" :src="l.image.src" :alt="l.image.alt" style="width:56px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0" />
                    <div>
                      <div style="font-weight:600">{{ l.name }}</div>
                      <div v-if="l.sku" style="color:#718096;font-size:12px">SKU {{ l.sku }}</div>
                      <div v-if="l.quantity_rule && (l.quantity_rule.min > 1 || l.quantity_rule.max || l.quantity_rule.increment > 1)" style="color:#718096;font-size:12px">
                        Order minimum {{ l.quantity_rule.min }}<template v-if="l.quantity_rule.increment > 1">, in steps of {{ l.quantity_rule.increment }}</template><template v-if="l.quantity_rule.max">, maximum {{ l.quantity_rule.max }}</template>
                      </div>
                      <div v-if="l.price_changed" data-testid="price-changed" style="color:#975a16;font-size:13px;margin-top:4px">Price changed from {{ money(l.price_changed.was) }} to {{ money(l.price_changed.now) }}.</div>
                      <div v-for="(i, n) in l.issues" :key="n" style="color:#c53030;font-size:13px;margin-top:4px">{{ i.message }}</div>
                    </div>
                  </div>
                </td>
                <td :style="right">{{ l.unit_excl ? money(l.unit_excl) : '' }}</td>
                <td :style="right">
                  <input :value="typed[l.line_id] ?? l.pack_qty" type="number" min="1" inputmode="numeric" :disabled="busy" :aria-label="`Quantity of ${l.name}`"
                         style="width:80px;padding:8px;border:1px solid #cbd5e0;border-radius:6px;text-align:right"
                         @input="typed[l.line_id] = ($event.target as HTMLInputElement).value" @change="setQty(l)" @keyup.enter="setQty(l)" />
                </td>
                <td :style="right">{{ l.line_excl ? money(l.line_excl) : '' }}</td>
                <td :style="cell"><button type="button" :disabled="busy" style="background:none;border:none;color:#a0aec0;cursor:pointer;font-size:20px" title="Remove" :aria-label="`Remove ${l.name}`" @click="remove(l)">×</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex;gap:32px;flex-wrap:wrap;margin-top:24px">
          <div style="flex:1;min-width:280px">
            <label for="loc" style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Deliver to</label>
            <select id="loc" :value="view.cart.location_id" :disabled="busy" style="width:100%;padding:12px;border:1px solid #cbd5e0;border-radius:6px;font-size:15px" @change="setLocation">
              <option v-for="loc in view.locations" :key="loc.id" :value="loc.id">{{ loc.label }}{{ loc.address ? ' - ' + loc.address : '' }}</option>
            </select>
            <p v-if="view.delivery" data-testid="delivery-info" style="color:#4a5568;font-size:14px;margin:12px 0 0">
              <strong>{{ view.delivery.label }}:</strong>{{ ' ' }}
              <template v-if="view.delivery.charged">{{ money(view.delivery.fee_excl) }}{{ view.vat_applies ? ' excl. VAT' : '' }}<template v-if="view.delivery.free_remaining_excl">. Add {{ money(view.delivery.free_remaining_excl) }} more for free delivery.</template></template>
              <template v-else>free on this order.</template>
              <template v-if="view.delivery.lead_time"> Lead time: {{ view.delivery.lead_time }}.</template>
            </p>
            <p v-else style="color:#4a5568;font-size:14px;margin:12px 0 0">Delivery is arranged with us after you order.</p>
            <p style="color:#4a5568;font-size:14px;margin:8px 0 0">
              <template v-if="view.payment.basis === 'terms'">Payment: on account, {{ view.payment.terms_name }}.</template>
              <template v-else>Payment: prepayment. Your order is held until we receive payment.</template>
            </p>
          </div>

          <div style="width:340px;max-width:100%">
            <table style="width:100%;font-size:15px" data-testid="cart-totals">
              <tr><td style="padding:4px 0">{{ view.vat_applies ? 'Subtotal excl. VAT' : 'Subtotal' }}</td><td style="text-align:right">{{ money(view.totals.goods_excl) }}</td></tr>
              <tr v-if="Number(view.totals.delivery_excl) > 0"><td style="padding:4px 0">{{ view.delivery?.label || 'Delivery' }}{{ view.vat_applies ? ' excl. VAT' : '' }}</td><td style="text-align:right">{{ money(view.totals.delivery_excl) }}</td></tr>
              <tr v-if="view.vat_applies"><td style="padding:4px 0">{{ view.tax_label }}</td><td style="text-align:right">{{ money(view.totals.tax) }}</td></tr>
              <tr style="font-weight:700;font-size:18px"><td style="padding:10px 0;border-top:1px solid #e2e8f0">Total{{ view.vat_applies ? ' incl. VAT' : '' }}</td><td style="text-align:right;border-top:1px solid #e2e8f0">{{ money(view.totals.gross) }}</td></tr>
            </table>
            <p v-if="blockers.includes('MINIMUM')" data-testid="minimum-hint" style="color:#975a16;font-size:13px">Minimum order {{ money(view.minimum.amount) }}{{ view.vat_applies ? ' excl. VAT' : '' }}: add {{ money(view.minimum.shortfall) }} more.</p>
            <p v-for="b in showable.filter(x => x !== 'MINIMUM')" :key="b" style="color:#c53030;font-size:13px;margin:6px 0">{{ reasons[b] }}</p>
            <NuxtLink v-if="blockers.length === 0 || (blockers.length === 1 && blockers[0] === 'PO_REQUIRED')" to="/trade/checkout" external data-testid="to-checkout"
              style="display:block;background:#2b6cb0;color:#fff;text-align:center;padding:14px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;margin-top:12px">Proceed to checkout</NuxtLink>
            <span v-else aria-disabled="true" style="display:block;background:#cbd5e0;color:#fff;text-align:center;padding:14px;border-radius:8px;font-weight:700;font-size:16px;margin-top:12px">Proceed to checkout</span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
