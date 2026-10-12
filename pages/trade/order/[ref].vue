<script setup lang="ts">
// Trade order confirmation (B2B Session 5a). Everything is read back from Stratum for the signed-in company.
useHead({ title: 'Order confirmation', meta: [{ name: 'robots', content: 'noindex' }] })

const { me } = await useTrade()
if (!me.value.enabled) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const route = useRoute()
const ref_ = String(route.params.ref ?? '')
const requestFetch = useRequestFetch()
const { data: o, error } = await useAsyncData(`trade-order-${ref_}`, () => requestFetch<any>(`/api/trade/order/${encodeURIComponent(ref_)}`).catch(() => null))

const sym = computed(() => (o.value?.currency === 'ZAR' ? 'R' : o.value?.currency || ''))
function money(v: string | number) {
  const n = Number(v)
  return `${sym.value} ${(Number.isFinite(n) ? n : 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, ' ')}`
}
const cell = 'padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:14px'
const right = cell + ';text-align:right;white-space:nowrap'
</script>

<template>
  <div style="max-width:900px;margin:32px auto;padding:0 16px" data-testid="trade-order">
    <p v-if="!o" role="alert" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px">We could not find that order.</p>
    <template v-else>
      <h1 style="font-size:28px;margin:0 0 8px">Thank you for your order</h1>
      <p style="color:#4a5568;margin:0 0 20px" data-testid="order-ref">
        Order <strong>{{ o.order_number }}</strong>. We have issued {{ o.document_title }} <strong>{{ o.invoice_number }}</strong>.
        <template v-if="o.po_number"> Your purchase order: <strong>{{ o.po_number }}</strong>.</template>
      </p>

      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="text-align:left;font-size:12px;text-transform:uppercase;color:#718096">
            <th style="padding:8px">Product</th><th style="padding:8px;text-align:right">Qty</th>
            <th style="padding:8px;text-align:right">Price{{ o.vat_applies ? ' excl. VAT' : '' }}</th><th style="padding:8px;text-align:right">Total{{ o.vat_applies ? ' excl. VAT' : '' }}</th>
          </tr></thead>
          <tbody>
            <tr v-for="(l, i) in o.lines" :key="i">
              <td :style="cell">{{ l.description }}</td><td :style="right">{{ l.base_qty }}</td><td :style="right">{{ money(l.unit_excl) }}</td><td :style="right">{{ money(l.line_excl) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table style="margin:16px 0 0 auto;font-size:15px;min-width:300px" data-testid="order-totals">
        <tr><td style="padding:4px 12px 4px 0">{{ o.vat_applies ? 'Subtotal excl. VAT' : 'Subtotal' }}</td><td style="text-align:right">{{ money(o.totals.goods_excl) }}</td></tr>
        <tr v-if="Number(o.totals.delivery_excl) > 0"><td style="padding:4px 12px 4px 0">{{ o.delivery.label || 'Delivery' }}{{ o.vat_applies ? ' excl. VAT' : '' }}</td><td style="text-align:right">{{ money(o.totals.delivery_excl) }}</td></tr>
        <tr v-if="o.vat_applies"><td style="padding:4px 12px 4px 0">VAT</td><td style="text-align:right">{{ money(o.totals.tax) }}</td></tr>
        <tr style="font-weight:700;font-size:18px"><td style="padding:10px 12px 0 0;border-top:1px solid #e2e8f0">Total{{ o.vat_applies ? ' incl. VAT' : '' }}</td><td style="text-align:right;border-top:1px solid #e2e8f0">{{ money(o.totals.gross) }}</td></tr>
      </table>

      <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-top:24px;font-size:14px" data-testid="order-payment">
        <template v-if="o.payment.basis === 'terms'"><strong>Payment: on account</strong>, {{ o.payment.terms_name }}. Due {{ o.payment.due_date }}.</template>
        <template v-else>
          <strong>Payment: prepayment (EFT).</strong> Your order is awaiting payment.
          <div v-if="o.payment.bank_details" style="margin-top:8px;white-space:pre-line">{{ o.payment.bank_details }}</div>
          <div v-else style="margin-top:8px">We will send you our bank details shortly.</div>
          <div style="margin-top:8px">Please use <strong>{{ o.invoice_number }}</strong> as your payment reference.</div>
        </template>
        <div style="margin-top:10px"><strong>Deliver to:</strong> {{ o.delivery.location }}<template v-if="o.delivery.lead_time">. Lead time: {{ o.delivery.lead_time }}.</template></div>
      </div>
      <p style="margin-top:24px"><NuxtLink to="/" style="color:#2b6cb0">Continue shopping</NuxtLink></p>
    </template>
  </div>
</template>
