<script setup lang="ts">
// The trade account overview (Session 8c, read only): what is owed, what is overdue, credit left, how old the debt is, the next invoice due.
import { moneyText } from '~/utils/tradeAccount'

useHead({ title: 'My account', meta: [{ name: 'robots', content: 'noindex' }] })

const { me } = await useTrade()
if (!me.value.enabled) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const requestFetch = useRequestFetch()
const { data: s } = await useAsyncData('trade-account-summary', () => requestFetch<any>('/api/trade/account/summary')
  .catch((e: any) => ({ __error: String(e?.data?.statusMessage || e?.data?.message || 'We could not load your account right now.') })))
const failed = computed(() => (s.value as any)?.__error as string | undefined)
const card = 'border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;background:#fff'
</script>

<template>
  <div style="max-width:900px;margin:32px auto;padding:0 16px" data-testid="trade-account">
    <h1 style="font-size:28px;margin:0 0 4px">My account</h1>
    <p v-if="s && !failed" style="color:#4a5568;margin:0 0 16px">{{ s.company }}. Figures as of {{ s.as_of }}.</p>
    <TradeAccountTabs current="summary" />

    <p v-if="failed" role="alert" data-testid="account-error" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px">{{ failed }}</p>
    <template v-else-if="s">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px" data-testid="account-cards">
        <div :style="card"><div style="font-size:12px;text-transform:uppercase;color:#718096">Owing</div><div style="font-size:24px;font-weight:700" data-testid="account-open">{{ moneyText(s.open_minor) }}</div><div style="color:#718096;font-size:13px">{{ s.open_count }} open invoice{{ s.open_count === 1 ? '' : 's' }}</div></div>
        <div :style="card"><div style="font-size:12px;text-transform:uppercase;color:#718096">Overdue</div><div :style="{ fontSize: '24px', fontWeight: 700, color: s.overdue_minor > 0 ? '#c53030' : 'inherit' }" data-testid="account-overdue">{{ moneyText(s.overdue_minor) }}</div><div style="color:#718096;font-size:13px">{{ s.overdue_count }} invoice{{ s.overdue_count === 1 ? '' : 's' }}</div></div>
        <div :style="card" data-testid="account-credit">
          <div style="font-size:12px;text-transform:uppercase;color:#718096">Credit available</div>
          <template v-if="s.credit_limit_minor === null"><div style="font-size:18px;font-weight:600">No limit set</div></template>
          <template v-else>
            <div style="font-size:24px;font-weight:700" data-testid="account-available">{{ moneyText(s.available_minor) }}</div>
            <div style="color:#718096;font-size:13px">of a limit of {{ moneyText(s.credit_limit_minor) }}<template v-if="s.over_limit"> (you are over your limit)</template></div>
          </template>
        </div>
      </div>

      <p v-if="s.next_due" data-testid="account-next-due" style="margin:0 0 20px">
        <strong>{{ s.next_due.overdue ? 'Oldest unpaid invoice' : 'Next invoice due' }}:</strong>
        {{ s.next_due.number }}, {{ moneyText(s.next_due.balance_minor) }}, due {{ s.next_due.due_date }}.
        <NuxtLink to="/trade/account/invoices?status=open" style="color:#2b6cb0">See open invoices</NuxtLink>
      </p>
      <p v-else data-testid="account-nothing-due" style="margin:0 0 20px">You have no unpaid invoices. Thank you.</p>

      <h2 style="font-size:18px;margin:0 0 8px">How old is what you owe</h2>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse" data-testid="account-bands">
          <thead><tr style="text-align:left;font-size:12px;text-transform:uppercase;color:#718096"><th v-for="b in s.buckets" :key="b.key" style="padding:8px">{{ b.label }}</th><th style="padding:8px">Total</th></tr></thead>
          <tbody><tr>
            <td v-for="b in s.buckets" :key="b.key" :data-band="b.key" style="padding:10px 8px;border-bottom:1px solid #e2e8f0">{{ moneyText(b.minor) }}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-weight:700">{{ moneyText(s.open_minor) }}</td>
          </tr></tbody>
        </table>
      </div>
      <p v-if="!s.ageing_complete" style="color:#718096;font-size:13px">This list is very long, so the bands above are not complete.</p>
      <p style="color:#718096;font-size:13px;margin-top:8px">Counted from each invoice's due date.</p>

      <ul style="margin:16px 0 0;padding-left:18px;color:#4a5568">
        <li v-if="s.unapplied_credit_minor > 0" data-testid="account-credit-notes">Credit notes not used yet: <strong>{{ moneyText(s.unapplied_credit_minor) }}</strong>. They are not taken off the amounts above.</li>
        <li v-if="s.prepay_minor > 0" data-testid="account-prepay">Invoices waiting for your payment before we deliver: <strong>{{ moneyText(s.prepay_minor) }}</strong> (not counted above).</li>
      </ul>
    </template>
  </div>
</template>
