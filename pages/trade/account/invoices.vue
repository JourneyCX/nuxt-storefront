<script setup lang="ts">
// Invoices and credit notes (Session 8c, read only): every invoice of the company, from any channel, labelled with where it came from.
import { INVOICE_STATUSES, STATUS_LABELS, STATE_LABELS, SOURCE_LABELS, moneyText, parseInvoiceQuery } from '~/utils/tradeAccount'

useHead({ title: 'Invoices and credit notes', meta: [{ name: 'robots', content: 'noindex' }] })

const { me } = await useTrade()
if (!me.value.enabled) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const route = useRoute()
const query = computed(() => parseInvoiceQuery(route.query as Record<string, unknown>))
const requestFetch = useRequestFetch()
const { data: d } = await useAsyncData('trade-account-invoices', () => requestFetch<any>('/api/trade/account/invoices', { query: { status: query.value.status, ...(query.value.after ? { after: query.value.after } : {}) } })
  .catch((e: any) => ({ __error: String(e?.data?.statusMessage || e?.data?.message || 'We could not load your invoices right now.') })), { watch: [query] })
const failed = computed(() => (d.value as any)?.__error as string | undefined)
const cell = 'padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:14px'
const right = cell + ';text-align:right;white-space:nowrap'
</script>

<template>
  <div style="max-width:1000px;margin:32px auto;padding:0 16px" data-testid="trade-account-invoices">
    <h1 style="font-size:28px;margin:0 0 16px">Invoices and credit notes</h1>
    <TradeAccountTabs current="invoices" />

    <p style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px">
      <NuxtLink
        v-for="s in INVOICE_STATUSES" :key="s" :to="{ path: '/trade/account/invoices', query: { status: s } }" :data-filter="s"
        :aria-current="query.status === s ? 'true' : undefined"
        :style="{ padding: '4px 12px', borderRadius: '999px', border: '1px solid #cbd5e0', textDecoration: 'none', fontSize: '13px', background: query.status === s ? '#2d3748' : '#fff', color: query.status === s ? '#fff' : '#2d3748' }"
      >{{ STATUS_LABELS[s] }}</NuxtLink>
    </p>

    <p v-if="failed" role="alert" data-testid="account-error" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px">{{ failed }}</p>
    <template v-else-if="d">
      <p v-if="!d.rows.length" data-testid="account-empty" style="color:#4a5568">Nothing to show here.</p>
      <div v-else style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse" data-testid="account-documents">
          <thead><tr style="text-align:left;font-size:12px;text-transform:uppercase;color:#718096">
            <th style="padding:8px">Number</th><th style="padding:8px">Date</th><th style="padding:8px">Due</th>
            <th style="padding:8px;text-align:right">Total</th><th style="padding:8px;text-align:right">Balance</th><th style="padding:8px">Status</th><th style="padding:8px">From</th><th style="padding:8px">Download</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in d.rows" :key="r.kind + r.id" :data-doc="r.kind + ':' + r.id">
              <td :style="cell"><strong>{{ r.number }}</strong><span v-if="r.kind === 'credit_note'" style="color:#718096"> (credit note)</span></td>
              <td :style="cell">{{ r.date }}</td>
              <td :style="cell">{{ r.due_date || '' }}</td>
              <td :style="right">{{ moneyText(r.total_minor) }}</td>
              <td :style="right">{{ moneyText(r.balance_minor) }}</td>
              <td :style="cell"><span :style="{ color: r.state === 'overdue' ? '#c53030' : 'inherit', fontWeight: r.state === 'overdue' ? 700 : 400 }">{{ STATE_LABELS[r.state] || r.state }}</span></td>
              <td :style="cell">
                <NuxtLink v-if="r.order_number && r.source === 'trade_order'" :to="'/trade/order/' + r.order_number" style="color:#2b6cb0">{{ r.order_number }}</NuxtLink>
                <template v-else>{{ SOURCE_LABELS[r.source] || 'Other' }}<span v-if="r.order_number" style="color:#718096"> {{ r.order_number }}</span></template>
              </td>
              <td :style="cell"><a v-if="r.kind === 'invoice' && r.state !== 'cancelled'" :href="'/api/trade/account/invoice/' + r.id" style="color:#2b6cb0" :aria-label="'Download ' + r.number">PDF</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="d.next_after" style="margin-top:16px"><NuxtLink :to="{ path: '/trade/account/invoices', query: { status: query.status, after: d.next_after } }" data-testid="account-older" style="color:#2b6cb0">Older</NuxtLink></p>
    </template>
  </div>
</template>
