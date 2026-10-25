<script setup lang="ts">
// The statement (Session 8c, read only): opening balance, every movement with a running balance, closing balance; also as a spreadsheet.
import { KIND_LABELS, moneyText, parseStatementQuery } from '~/utils/tradeAccount'

useHead({ title: 'Statement', meta: [{ name: 'robots', content: 'noindex' }] })

const { me } = await useTrade()
if (!me.value.enabled) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const route = useRoute()
const range = computed(() => parseStatementQuery(route.query as Record<string, unknown>, new Date()))
const requestFetch = useRequestFetch()
const { data: s } = await useAsyncData('trade-account-statement', () => requestFetch<any>('/api/trade/account/statement', { query: range.value })
  .catch((e: any) => ({ __error: String(e?.data?.statusMessage || e?.data?.message || 'We could not load your statement right now.') })), { watch: [range] })
const failed = computed(() => (s.value as any)?.__error as string | undefined)
const from = ref(range.value.from)
const to = ref(range.value.to)
const cell = 'padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:14px'
const right = cell + ';text-align:right;white-space:nowrap'
</script>

<template>
  <div style="max-width:1000px;margin:32px auto;padding:0 16px" data-testid="trade-account-statement">
    <h1 style="font-size:28px;margin:0 0 16px">Statement</h1>
    <TradeAccountTabs current="statement" />

    <form method="get" action="/trade/account/statement" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin:0 0 16px" data-testid="statement-form">
      <label style="font-size:13px">From<br><input v-model="from" type="date" name="from" required style="padding:6px"></label>
      <label style="font-size:13px">To<br><input v-model="to" type="date" name="to" required style="padding:6px"></label>
      <button type="submit" style="padding:7px 16px;border:0;border-radius:6px;background:#2b6cb0;color:#fff;cursor:pointer">Show</button>
      <a :href="'/api/trade/account/statement.csv?from=' + range.from + '&to=' + range.to" data-testid="statement-csv" style="color:#2b6cb0;padding:7px 0">Download as a spreadsheet</a>
    </form>

    <p v-if="failed" role="alert" data-testid="account-error" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px">{{ failed }}</p>
    <template v-else-if="s">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse" data-testid="account-statement">
          <thead><tr style="text-align:left;font-size:12px;text-transform:uppercase;color:#718096">
            <th style="padding:8px">Date</th><th style="padding:8px">What</th><th style="padding:8px">Reference</th>
            <th style="padding:8px;text-align:right">Debit</th><th style="padding:8px;text-align:right">Credit</th><th style="padding:8px;text-align:right">Balance</th>
          </tr></thead>
          <tbody>
            <tr><td :style="cell">{{ s.from }}</td><td :style="cell" colspan="4">Opening balance</td><td :style="right" data-testid="statement-opening">{{ moneyText(s.opening_minor) }}</td></tr>
            <tr v-for="(l, i) in s.lines" :key="i">
              <td :style="cell">{{ l.date }}</td><td :style="cell">{{ KIND_LABELS[l.kind] || l.kind }}</td><td :style="cell">{{ l.reference }}</td>
              <td :style="right">{{ l.debit_minor ? moneyText(l.debit_minor) : '' }}</td><td :style="right">{{ l.credit_minor ? moneyText(l.credit_minor) : '' }}</td><td :style="right">{{ moneyText(l.balance_minor) }}</td>
            </tr>
            <tr style="font-weight:700"><td :style="cell">{{ s.to }}</td><td :style="cell" colspan="4">Closing balance</td><td :style="right" data-testid="statement-closing">{{ moneyText(s.closing_minor) }}</td></tr>
          </tbody>
        </table>
      </div>
      <p v-if="s.truncated" data-testid="statement-cut" style="color:#718096;font-size:13px">This statement is very long and was cut short. Choose fewer days to see the rest.</p>
    </template>
  </div>
</template>
