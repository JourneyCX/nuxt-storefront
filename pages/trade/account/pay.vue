<script setup lang="ts">
// Paying invoices by bank transfer with proof (Session 8d). The buyer chooses invoices, is given the reference to pay with BEFORE paying, and
// uploads the proof now or later. Every figure on this page was given by the back office, and the only amount the browser sends is "the amount
// I paid", which the merchant uses to compare with the bank statement and never as an amount to record.
import { AMOUNT_HINT, PAY_MAX_INVOICES, PAY_STATUS_LABELS, normaliseAmount } from '~/utils/tradePay'
import { moneyText } from '~/utils/tradeAccount'

useHead({ title: 'Pay invoices', meta: [{ name: 'robots', content: 'noindex' }] })

const { me } = await useTrade()
if (!me.value.enabled) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const route = useRoute()
const requestFetch = useRequestFetch()
const say = (e: any, fallback: string) => String(e?.data?.statusMessage || e?.data?.message || fallback)
const { data: options, refresh: refreshOptions } = await useAsyncData('trade-pay-options', () => requestFetch<any>('/api/trade/account/pay/options')
  .catch((e: any) => ({ __error: say(e, 'We could not load your invoices right now.') })))
const { data: mine, refresh: refreshMine } = await useAsyncData('trade-pay-list', () => requestFetch<any>('/api/trade/account/pay/list')
  .catch((e: any) => ({ __error: say(e, 'We could not load your payments right now.') })))

const failed = computed(() => ((options.value as any)?.__error || (mine.value as any)?.__error) as string | undefined)
const invoices = computed<any[]>(() => (options.value as any)?.invoices ?? [])
const orders = computed<any[]>(() => (options.value as any)?.orders ?? [])
const eft = computed(() => Boolean((options.value as any)?.eft))
const payments = computed<any[]>(() => (mine.value as any)?.payments ?? [])

// The buttons stay off until the page is live in the browser: a click on the server-rendered page, before it is hydrated, would do nothing.
const ready = ref(false)
onMounted(() => { ready.value = true })
const selected = ref<number[]>([])
const selectedTotal = computed(() => invoices.value.filter(i => selected.value.includes(i.id)).reduce((n, i) => n + Number(i.balance_minor || 0), 0))
const allTotal = computed(() => invoices.value.reduce((n, i) => n + Number(i.balance_minor || 0), 0))
const starting = ref(false)
const startError = ref('')
const currentId = ref(String(route.query.payment || ''))
const current = computed(() => payments.value.find(p => p.id === currentId.value) ?? null)
const canUpload = (p: any) => ['requested', 'pending', 'declined'].includes(String(p?.status))

async function start(all: boolean) {
  startError.value = ''
  if (!all && !selected.value.length) { startError.value = 'Tick the invoices you want to pay.'; return }
  if (!all && selected.value.length > PAY_MAX_INVOICES) { startError.value = `Choose up to ${PAY_MAX_INVOICES} invoices.`; return }
  starting.value = true
  try {
    const r = await $fetch<any>('/api/trade/account/pay/start', { method: 'POST', body: all ? { all: true } : { invoice_ids: selected.value } })
    currentId.value = String(r?.payment?.id || '')
    selected.value = []
    await Promise.all([refreshMine(), refreshOptions()])
  } catch (e: any) { startError.value = say(e, 'We could not start that payment. Please try again.') } finally { starting.value = false }
}

const buyerReference = ref('')
const buyerTotal = ref('')
const amountOk = computed(() => buyerTotal.value.trim() === '' || normaliseAmount(buyerTotal.value) !== null)
const upMessage = ref('')
const upOk = ref(true)
const upBusy = ref(false)
const MAX_FILES = 3
const MAX_BYTES = 5 * 1024 * 1024

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('read'))
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.readAsDataURL(file)
  })
}

async function upload(e: Event) {
  const form = e.target as HTMLFormElement
  const input = form.elements.namedItem('files') as HTMLInputElement
  const files = Array.from(input.files ?? [])
  upMessage.value = ''
  if (!current.value) return
  if (!files.length || files.length > MAX_FILES) { upOk.value = false; upMessage.value = `Choose between 1 and ${MAX_FILES} files.`; return }
  if (files.some(f => f.size > MAX_BYTES)) { upOk.value = false; upMessage.value = 'A file is larger than the 5 MB limit.'; return }
  if (!amountOk.value) { upOk.value = false; upMessage.value = `Enter the amount you paid in rand and cents, ${AMOUNT_HINT}, or leave it blank.`; return }
  upBusy.value = true
  try {
    const body = {
      files: await Promise.all(files.map(async f => ({ name: f.name, data: await toBase64(f) }))),
      buyer_reference: buyerReference.value,
      buyer_total: buyerTotal.value,
    }
    const r = await $fetch<any>(`/api/trade/account/pay/${encodeURIComponent(current.value.id)}/upload`, { method: 'POST', body })
      .catch((err: any) => err?.data?.data ?? err?.data ?? { ok: false, message: 'The upload could not be completed. Please try again.' })
    // On success refresh what the page shows FIRST and thank the buyer after, so the thank-you never sits beside a stale status.
    if (r?.ok) { input.value = ''; buyerReference.value = ''; buyerTotal.value = ''; await Promise.all([refreshMine(), refreshOptions()]) }
    upOk.value = Boolean(r?.ok)
    upMessage.value = String(r?.message || r?.statusMessage || (r?.ok ? 'Uploaded.' : 'The upload was not accepted.'))
  } catch { upOk.value = false; upMessage.value = 'The file could not be read. Please try again.' } finally { upBusy.value = false }
}

const card = 'border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;background:#fff;margin-bottom:14px'
const cell = 'padding:9px 8px;border-bottom:1px solid #e2e8f0;font-size:14px'
const btn = 'padding:8px 16px;border:0;border-radius:6px;background:#2b6cb0;color:#fff;cursor:pointer;font-size:14px'
const btnGhost = 'padding:8px 16px;border:1px solid #cbd5e0;border-radius:6px;background:#fff;color:#2d3748;cursor:pointer;font-size:14px'
</script>

<template>
  <div style="max-width:1000px;margin:32px auto;padding:0 16px" data-testid="trade-pay" :data-ready="ready ? 'true' : 'false'">
    <h1 style="font-size:28px;margin:0 0 16px">Pay invoices</h1>
    <TradeAccountTabs current="pay" />

    <p v-if="failed" role="alert" data-testid="account-error" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px">{{ failed }}</p>
    <template v-else>
      <p v-if="!eft" data-testid="pay-eft-off" style="color:#4a5568">Payment by bank transfer is not available right now. Please contact us.</p>

      <!-- a payment in hand: the reference first, then the proof -->
      <section v-if="current" :style="card + ';border-color:#2b6cb0'" data-testid="pay-current" :data-payment="current.id">
        <h2 style="font-size:18px;margin:0 0 6px">Your payment</h2>
        <p style="margin:0 0 4px;color:#4a5568">{{ current.reference_kind === 'code' ? 'Use this reference when you pay. It covers ' + current.lines.length + ' invoices.' : 'Use the invoice number as your payment reference.' }}</p>
        <p style="font-size:26px;font-weight:700;letter-spacing:.04em;margin:4px 0 10px" data-testid="pay-reference">{{ current.reference }}</p>
        <p style="margin:0 0 6px">Amount of the invoices: <strong data-testid="pay-total">{{ moneyText(current.total_minor) }}</strong>. <span style="color:#718096">Pay what you owe on them; if you pay a different amount, tell us below.</span></p>
        <pre v-if="current.bank_details" data-testid="pay-bank" style="white-space:pre-wrap;background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin:0 0 10px;font-family:inherit">{{ current.bank_details }}</pre>
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
          <tbody>
            <tr v-for="l in current.lines" :key="l.invoice_id" :data-line="l.invoice_id">
              <td :style="cell"><strong>{{ l.number }}</strong></td>
              <td :style="cell">{{ l.due_date ? 'due ' + l.due_date : '' }}</td>
              <td :style="cell + ';text-align:right'">{{ moneyText(l.balance_minor) }}</td>
              <td :style="cell">{{ l.state_label }}<span v-if="l.also_waiting" style="color:#b7791f" data-flag="also-waiting"> (another payment for this invoice is already waiting for us to check)</span></td>
            </tr>
          </tbody>
        </table>

        <p data-testid="pay-status" style="margin:0 0 8px"><strong>{{ PAY_STATUS_LABELS[current.status] || current.status }}</strong></p>
        <p v-if="current.decline_reason" role="alert" data-testid="pay-declined" style="color:#c53030;margin:0 0 8px">We could not use your proof: {{ current.decline_reason }}</p>
        <p v-if="current.closing_note" data-testid="pay-note" style="margin:0 0 8px">Note from us: {{ current.closing_note }}</p>
        <p v-if="current.files.length" style="margin:0 0 8px;color:#4a5568">Uploaded: {{ current.files.join(', ') }}</p>

        <form v-if="eft && canUpload(current)" data-testid="pay-upload-form" @submit.prevent="upload">
          <strong>Paid already? Upload your proof of payment.</strong>
          <p style="margin:6px 0"><input name="files" type="file" multiple accept="application/pdf,image/jpeg,image/png" data-testid="pay-files"> <span style="color:#718096;font-size:13px">PDF, JPEG or PNG, up to 3 files of 5 MB.</span></p>
          <p style="margin:6px 0"><label>The reference I used (if it was not the one above)<br><input v-model="buyerReference" name="buyer_reference" type="text" maxlength="100" autocomplete="off" data-testid="pay-ref-used" style="width:20rem;max-width:100%"></label></p>
          <p style="margin:6px 0"><label>The amount I paid (optional)<br><input v-model="buyerTotal" name="buyer_total" type="text" inputmode="decimal" autocomplete="off" data-testid="pay-amount" style="width:12rem"></label>
            <span style="color:#718096;font-size:13px"> {{ AMOUNT_HINT }}. This is only for our records: we record the payment from our bank statement.</span>
            <span v-if="!amountOk" role="alert" data-testid="pay-amount-bad" style="display:block;color:#c53030;font-size:13px">That amount cannot be read. Use {{ AMOUNT_HINT }}.</span></p>
          <button type="submit" :disabled="upBusy || !amountOk || !ready" :style="btn" data-testid="pay-upload-button">{{ upBusy ? 'Uploading…' : 'Upload proof' }}</button>
          <p v-if="upMessage" :role="upOk ? 'status' : 'alert'" data-testid="pay-upload-message" :style="{ margin: '8px 0 0', color: upOk ? '#276749' : '#c53030' }">{{ upMessage }}</p>
        </form>
        <p v-else-if="eft && current.status === 'requested'" style="color:#718096">You can upload your proof of payment later, from this page.</p>
      </section>

      <!-- choose invoices -->
      <section :style="card" data-testid="pay-choose">
        <h2 style="font-size:18px;margin:0 0 8px">Choose what you are paying</h2>
        <p v-if="!invoices.length" data-testid="pay-nothing" style="color:#4a5568;margin:0">You have no open invoices to pay. Thank you.</p>
        <template v-else>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse" data-testid="pay-invoices">
              <thead><tr style="text-align:left;font-size:12px;text-transform:uppercase;color:#718096">
                <th style="padding:8px">Pay</th><th style="padding:8px">Invoice</th><th style="padding:8px">Due</th><th style="padding:8px;text-align:right">You owe</th><th style="padding:8px"></th>
              </tr></thead>
              <tbody>
                <tr v-for="i in invoices" :key="i.id" :data-invoice="i.id">
                  <td :style="cell"><input v-model="selected" type="checkbox" :value="i.id" :aria-label="'Pay ' + i.number" :data-testid="'pay-pick-' + i.id" :disabled="!eft || !ready"></td>
                  <td :style="cell"><strong>{{ i.number }}</strong></td>
                  <td :style="cell"><span :style="{ color: i.overdue ? '#c53030' : 'inherit', fontWeight: i.overdue ? 700 : 400 }">{{ i.due_date }}{{ i.overdue ? ' (overdue)' : '' }}</span></td>
                  <td :style="cell + ';text-align:right;white-space:nowrap'">{{ moneyText(i.balance_minor) }}</td>
                  <td :style="cell"><span v-if="i.also_waiting" style="color:#b7791f;font-size:13px" data-flag="also-waiting">a payment for this invoice is already waiting for us to check</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!(options as any).complete" style="color:#718096;font-size:13px">You have a very long list; only the oldest are shown here.</p>
          <p style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:12px 0 0">
            <button type="button" :disabled="starting || !eft || !ready" :style="btn" data-testid="pay-selected" @click="start(false)">Pay the ticked invoices{{ selected.length ? ' (' + moneyText(selectedTotal) + ')' : '' }}</button>
            <button v-if="invoices.length <= PAY_MAX_INVOICES" type="button" :disabled="starting || !eft || !ready" :style="btnGhost" data-testid="pay-all" @click="start(true)">Pay everything that is open ({{ moneyText(allTotal) }})</button>
          </p>
          <p v-if="startError" role="alert" data-testid="pay-start-error" style="color:#c53030;margin:8px 0 0">{{ startError }}</p>
        </template>
      </section>

      <!-- orders that are paid on their own page -->
      <section v-if="orders.length" :style="card" data-testid="pay-orders">
        <h2 style="font-size:18px;margin:0 0 8px">Orders waiting for your payment</h2>
        <p style="margin:0 0 8px;color:#4a5568">These are paid on the order's own page, where you can also upload your proof of payment.</p>
        <ul style="margin:0;padding-left:18px">
          <li v-for="o in orders" :key="o.number"><NuxtLink :to="'/trade/order/' + o.number" style="color:#2b6cb0">{{ o.number }}</NuxtLink>: {{ moneyText(o.balance_minor) }} still to pay</li>
        </ul>
      </section>

      <!-- what has been started -->
      <section v-if="payments.length" data-testid="pay-list">
        <h2 style="font-size:18px;margin:0 0 8px">Your payments</h2>
        <ul style="list-style:none;margin:0;padding:0">
          <li v-for="p in payments" :key="p.id" :style="card" :data-payment-row="p.id">
            <strong>{{ p.reference }}</strong>
            <span style="color:#4a5568"> · {{ p.lines.map((l: any) => l.number).join(', ') }} · {{ moneyText(p.total_minor) }}</span><br>
            <span :data-status="p.status">{{ PAY_STATUS_LABELS[p.status] || p.status }}</span>
            <span v-if="p.closing_note"> · {{ p.closing_note }}</span>
            <button v-if="canUpload(p) && eft && p.id !== currentId" type="button" :style="btnGhost + ';margin-left:10px'" :disabled="!ready" :data-open="p.id" @click="currentId = p.id">{{ p.status === 'requested' ? 'Upload proof' : 'Open' }}</button>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
