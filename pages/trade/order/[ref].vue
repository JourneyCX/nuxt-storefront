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
  return `${sym.value} ${(Number.isFinite(n) ? n : 0).toFixed(2)}`
}
const cell = 'padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:14px'
const right = cell + ';text-align:right;white-space:nowrap'

// Proof of payment (Session 6c): only for an order that is waiting for its EFT. The page sends file names and contents; the platform decides.
const awaiting = computed(() => o.value?.status === 'awaiting_payment' && o.value?.payment?.basis === 'prepay')
const pop = ref<{ eft: boolean; proofs: Array<{ name: string; uploaded_at: string; status: string; decline_reason: string }> }>({ eft: false, proofs: [] })
const popMessage = ref('')
const popOk = ref(true)
const popBusy = ref(false)
const POP_MAX_FILES = 3
const POP_MAX_BYTES = 5 * 1024 * 1024
async function loadPop() {
  try { pop.value = await $fetch<any>(`/api/trade/order/${encodeURIComponent(ref_)}/pop`) } catch { /* the block simply stays hidden */ }
}
if (awaiting.value) await loadPop()
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('read'))
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.readAsDataURL(file)
  })
}
async function uploadPop(e: Event) {
  const input = (e.target as HTMLFormElement).elements.namedItem('files') as HTMLInputElement
  const files = Array.from(input.files ?? [])
  popMessage.value = ''
  if (!files.length || files.length > POP_MAX_FILES) { popOk.value = false; popMessage.value = `Choose between 1 and ${POP_MAX_FILES} files.`; return }
  if (files.some(f => f.size > POP_MAX_BYTES)) { popOk.value = false; popMessage.value = 'A file is larger than the 5 MB limit.'; return }
  popBusy.value = true
  try {
    const body = { files: await Promise.all(files.map(async f => ({ name: f.name, data: await toBase64(f) }))) }
    const r = await $fetch<any>(`/api/trade/order/${encodeURIComponent(ref_)}/pop`, { method: 'POST', body }).catch((err: any) => err?.data ?? { ok: false, message: 'The upload could not be completed. Please try again.' })
    popOk.value = Boolean(r?.ok)
    popMessage.value = String(r?.message || r?.statusMessage || (r?.ok ? 'Uploaded.' : 'The upload was not accepted.'))
    if (r?.ok) { input.value = ''; await loadPop() }
  } catch { popOk.value = false; popMessage.value = 'The file could not be read. Please try again.' } finally { popBusy.value = false }
}
</script>

<template>
  <div style="max-width:900px;margin:32px auto;padding:0 16px" data-testid="trade-order">
    <p v-if="!o" role="alert" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px">We could not find that order.</p>
    <template v-else>
      <h1 style="font-size:28px;margin:0 0 8px">{{ o.status === 'held' ? 'We have received your order' : (o.status === 'cancelled' || o.status === 'expired') ? 'This order was cancelled' : 'Thank you for your order' }}</h1>
      <p v-if="o.status === 'held'" role="status" data-testid="order-held" style="background:#fffaf0;border:1px solid #fbd38d;color:#7b341e;border-radius:6px;padding:10px 12px;margin:0 0 16px">
        Before we can process this order our accounts team needs to review it. There is nothing you need to do: we will email you as soon as it has been approved.
      </p>
      <p v-else-if="o.status === 'cancelled' || o.status === 'expired'" role="status" data-testid="order-cancelled" style="background:#f7fafc;border:1px solid #cbd5e0;color:#2d3748;border-radius:6px;padding:10px 12px;margin:0 0 16px">
        This order has been cancelled<template v-if="o.status === 'expired'"> because it was not paid in time</template>. Please contact us if you would like to order again.
      </p>
      <p style="color:#4a5568;margin:0 0 20px" data-testid="order-ref">
        Order <strong>{{ o.order_number }}</strong>.<template v-if="o.invoice_number"> We have issued {{ o.document_title }} <strong>{{ o.invoice_number }}</strong>.</template>
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

      <div v-if="o.status !== 'cancelled' && o.status !== 'expired'" style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-top:24px;font-size:14px" data-testid="order-payment">
        <template v-if="o.payment.basis === 'terms'"><strong>Payment: on account</strong>, {{ o.payment.terms_name }}.<template v-if="o.invoice_number"> Due {{ o.payment.due_date }}.</template><template v-else> Your invoice is issued when the order is approved.</template></template>
        <template v-else>
          <strong>Payment: prepayment (EFT).</strong> Your order is awaiting payment.
          <div v-if="o.payment.bank_details" style="margin-top:8px;white-space:pre-line">{{ o.payment.bank_details }}</div>
          <div v-else style="margin-top:8px">We will send you our bank details shortly.</div>
          <div style="margin-top:8px">Please use <strong>{{ o.invoice_number }}</strong> as your payment reference.</div>
          <div v-if="awaiting && pop.eft" style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0" data-testid="order-pop">
            <strong>Paid already? Upload your proof of payment.</strong>
            <ul v-if="pop.proofs.length" style="margin:8px 0;padding-left:18px" data-testid="order-pop-list">
              <li v-for="(p, i) in pop.proofs" :key="i">
                {{ p.name }} <span style="color:#718096">({{ p.uploaded_at }})</span>:
                <strong>{{ p.status === 'pending' ? 'waiting to be checked' : p.status === 'confirmed' ? 'received, thank you' : 'not accepted' }}</strong>
                <span v-if="p.status === 'declined' && p.decline_reason"> &mdash; {{ p.decline_reason }}</span>
              </li>
            </ul>
            <form style="margin-top:8px" @submit.prevent="uploadPop">
              <input name="files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-label="Proof of payment (PDF, JPEG or PNG, up to 3 files of 5 MB)">
              <button type="submit" :disabled="popBusy" style="margin-left:8px;padding:6px 14px;border:0;border-radius:6px;background:#2b6cb0;color:#fff;cursor:pointer">{{ popBusy ? 'Uploading…' : 'Upload' }}</button>
            </form>
            <p style="margin:6px 0 0;color:#718096;font-size:13px">PDF, JPEG or PNG; up to 3 files of 5 MB each. We check the payment against our bank account and email you.</p>
            <p v-if="popMessage" :role="popOk ? 'status' : 'alert'" data-testid="order-pop-message" :style="{ margin: '8px 0 0', color: popOk ? '#276749' : '#c53030' }">{{ popMessage }}</p>
          </div>
        </template>
        <div style="margin-top:10px"><strong>Deliver to:</strong> {{ o.delivery.location }}<template v-if="o.delivery.lead_time">. Lead time: {{ o.delivery.lead_time }}.</template></div>
      </div>
      <p style="margin-top:24px"><NuxtLink to="/" style="color:#2b6cb0">Continue shopping</NuxtLink></p>
    </template>
  </div>
</template>
