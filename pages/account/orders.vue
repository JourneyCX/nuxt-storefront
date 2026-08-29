<script setup lang="ts">
import type { AccountOrderSummary } from '~/server/api/account/orders.get'

const { account, fetchAccount } = useAccount()

const checking = ref(true)
const orders   = ref<AccountOrderSummary[]>([])
const loadingOrders = ref(false)

onMounted(async () => {
  await fetchAccount()
  checking.value = false
  if (!account.value) {
    navigateTo('/login')
    return
  }
  loadingOrders.value = true
  try {
    orders.value = await $fetch<AccountOrderSummary[]>('/api/account/orders')
  } finally {
    loadingOrders.value = false
  }
})

// WooCommerce order statuses, in the same plain-label style as
// order-confirmation.vue's payment method labelling.
const statusLabels: Record<string, string> = {
  pending:    'Pending Payment',
  processing: 'Processing',
  'on-hold':  'On Hold',
  completed:  'Completed',
  cancelled:  'Cancelled',
  refunded:   'Refunded',
  failed:     'Failed',
}

function statusLabel(status: string): string {
  return statusLabels[status] ?? status
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div v-if="checking" style="max-width:680px;margin:80px auto;padding:0 24px;text-align:center;color:#718096">
    Loading…
  </div>

  <div v-else style="max-width:680px;margin:0 auto;padding:48px 24px">
    <nav style="font-size:13px;color:#718096;margin-bottom:32px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <a href="/account" style="color:#3182ce;text-decoration:none">My Account</a>
      <span style="margin:0 8px">›</span>
      <span>Order History</span>
    </nav>

    <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 32px">Order History</h1>

    <p v-if="loadingOrders" style="color:#718096;font-size:14px">Loading orders…</p>

    <p v-else-if="orders.length === 0" style="color:#718096;font-size:14px">
      You haven't placed any orders yet.
    </p>

    <div v-else>
      <div v-for="order in orders" :key="order.id"
        style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid #e2e8f0">
        <div>
          <div style="font-size:14px;font-weight:600;color:#1a202c">Order #{{ order.id }}</div>
          <div style="font-size:13px;color:#718096;margin-top:2px">{{ formatDate(order.dateCreated) }} · {{ order.itemSummary }}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:600;color:#1a202c">{{ order.currency }} {{ order.total }}</div>
          <div style="font-size:12px;color:#718096;margin-top:2px">{{ statusLabel(order.status) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
