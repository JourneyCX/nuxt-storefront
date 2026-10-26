<script setup lang="ts">
// The tabs of the trade account area.
defineProps<{ current: 'summary' | 'invoices' | 'statement' | 'pay' }>()
const tabs = [
  { key: 'summary', label: 'Overview', to: '/trade/account' },
  { key: 'invoices', label: 'Invoices and credit notes', to: '/trade/account/invoices' },
  { key: 'statement', label: 'Statement', to: '/trade/account/statement' },
  { key: 'pay', label: 'Pay invoices', to: '/trade/account/pay' },
]
</script>

<template>
  <nav aria-label="Account" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px" data-testid="account-tabs">
    <NuxtLink
      v-for="t in tabs" :key="t.key" :to="t.to"
      :aria-current="current === t.key ? 'page' : undefined"
      :style="{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e0', textDecoration: 'none', fontSize: '14px', background: current === t.key ? '#2b6cb0' : '#fff', color: current === t.key ? '#fff' : '#2d3748' }"
    >{{ t.label }}</NuxtLink>
  </nav>
</template>
