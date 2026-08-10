<script setup lang="ts">
// Return-handling page for off-site payment gateways (PayFast today). The
// shopper lands here after WooCommerce's own return_url/cancel_url --
// rewritten by the stratum-headless plugin's woocommerce_get_return_url /
// woocommerce_get_cancel_order_url filters to point back here instead of
// WooCommerce's native (unbranded, on the internal WC domain) order-received
// page. By the time the browser gets here, PayFast's server-to-server ITN
// callback has normally already updated the order's real status -- this page
// just reads that status via GET /api/orders/{id}, it never sets it.
import type { OrderConfirmation } from '~/server/api/orders/[id].get'

const { fetchCart } = useCart()
const route = useRoute()

const orderId   = computed(() => Number(route.query.order_id))
const orderKey  = computed(() => String(route.query.key ?? ''))
const cancelled = computed(() => route.query.cancelled === '1')

const loading = ref(true)
const order   = ref<OrderConfirmation | null>(null)
const notFound = ref(false)

async function loadOrder() {
  if (!orderId.value || !orderKey.value) {
    notFound.value = true
    loading.value  = false
    return
  }
  try {
    order.value = await $fetch<OrderConfirmation>(`/api/orders/${orderId.value}`, {
      query: { key: orderKey.value },
    })
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadOrder)

// PayFast's ITN can occasionally arrive a few seconds after the shopper's
// browser redirect does -- if we land here and the order still shows
// 'pending' (not yet failed/cancelled), poll briefly rather than showing a
// stale "not confirmed" message for what's usually just a short race.
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollAttempts = 0
watch(order, (o) => {
  if (o && o.status === 'pending' && !cancelled.value && pollAttempts < 6) {
    pollAttempts++
    pollTimer = setTimeout(loadOrder, 3000)
  }
})
onUnmounted(() => { if (pollTimer) clearTimeout(pollTimer) })

const outcome = computed<'paid' | 'pending' | 'failed' | 'cancelled' | 'not_found'>(() => {
  if (notFound.value) return 'not_found'
  if (cancelled.value) return 'cancelled'
  const status = order.value?.status
  if (status === 'processing' || status === 'completed' || status === 'on-hold') return 'paid'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  return 'pending'
})

// WooCommerce leaves the shopper's cart populated after an off-site
// checkout call -- it only clears carts natively on its own "order
// received" page view, which this headless flow never triggers (see the
// comment at the top of this file, and server/api/cart/clear.post.ts for
// the confirmed-live repro). Fire once, only once the order is genuinely
// paid -- a cancelled/failed order deliberately keeps its cart intact so
// the shopper can retry via the "Try Again" link above.
const cartCleared = ref(false)
watch(outcome, async (o) => {
  if (o === 'paid' && !cartCleared.value) {
    cartCleared.value = true
    await $fetch('/api/cart/clear', { method: 'POST' }).catch(() => {})
    await fetchCart()
  }
})

function formatTotal(o: OrderConfirmation) {
  return `${o.currency} ${o.total}`
}

useHead({ title: 'Order Confirmation' })
</script>

<template>
  <div style="max-width:680px;margin:80px auto;padding:0 24px;text-align:center">

    <template v-if="loading">
      <div style="font-size:14px;color:#718096">Checking your payment status…</div>
    </template>

    <template v-else-if="outcome === 'paid'">
      <div style="font-size:56px;margin-bottom:16px">✅</div>
      <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 12px">Payment Received!</h1>
      <p style="font-size:16px;color:#4a5568;margin:0 0 8px">
        Thank you<span v-if="order?.firstName">, <strong>{{ order.firstName }}</strong></span>.
        Your order <strong>#{{ order?.id }}</strong> has been placed and paid.
      </p>
      <p v-if="order?.email" style="font-size:14px;color:#718096;margin:0 0 32px">
        A confirmation email will be sent to <strong>{{ order.email }}</strong>.
      </p>
      <div v-if="order" style="background:#f7f8fa;border-radius:12px;padding:24px;margin-bottom:32px;text-align:left">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#718096">Order total</span>
          <strong style="color:#1a202c">{{ formatTotal(order) }}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#718096">Payment</span>
          <span style="color:#1a202c">{{ order.paymentMethodTitle }}</span>
        </div>
      </div>
      <a href="/" style="display:inline-block;background:#2b6cb0;color:#fff;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px">
        Continue Shopping
      </a>
    </template>

    <template v-else-if="outcome === 'pending'">
      <div style="font-size:56px;margin-bottom:16px">⏳</div>
      <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 12px">Confirming Your Payment…</h1>
      <p style="font-size:16px;color:#4a5568;margin:0 0 32px">
        Your order <strong v-if="order">#{{ order.id }}</strong> was placed and we're still waiting on confirmation
        from PayFast. This page will update automatically — you can also safely refresh it, or check back shortly.
      </p>
      <a href="/" style="display:inline-block;background:#2b6cb0;color:#fff;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px">
        Continue Shopping
      </a>
    </template>

    <template v-else-if="outcome === 'cancelled'">
      <div style="font-size:56px;margin-bottom:16px">🚫</div>
      <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 12px">Payment Cancelled</h1>
      <p style="font-size:16px;color:#4a5568;margin:0 0 32px">
        Your payment was cancelled and no money was taken. Your order<span v-if="order"> #{{ order.id }}</span>
        has not been paid — you can try again whenever you're ready.
      </p>
      <a href="/checkout" style="display:inline-block;background:#2b6cb0;color:#fff;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;margin-right:12px">
        Try Again
      </a>
      <a href="/" style="display:inline-block;color:#3182ce;padding:14px 8px;font-weight:600;text-decoration:none;font-size:16px">
        Continue Shopping
      </a>
    </template>

    <template v-else-if="outcome === 'failed'">
      <div style="font-size:56px;margin-bottom:16px">⚠️</div>
      <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 12px">Payment Failed</h1>
      <p style="font-size:16px;color:#4a5568;margin:0 0 32px">
        We couldn't take payment for your order<span v-if="order"> #{{ order.id }}</span>. No money was taken.
        Please try again, or contact us if this keeps happening.
      </p>
      <a href="/checkout" style="display:inline-block;background:#2b6cb0;color:#fff;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;margin-right:12px">
        Try Again
      </a>
      <a href="/" style="display:inline-block;color:#3182ce;padding:14px 8px;font-weight:600;text-decoration:none;font-size:16px">
        Continue Shopping
      </a>
    </template>

    <template v-else>
      <div style="font-size:56px;margin-bottom:16px">❓</div>
      <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 12px">We couldn't find that order</h1>
      <p style="font-size:16px;color:#4a5568;margin:0 0 32px">
        This link may have expired or be incorrect. If you completed a payment, please contact us with your order
        details and we'll confirm it for you.
      </p>
      <a href="/" style="display:inline-block;background:#2b6cb0;color:#fff;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px">
        Back to Store
      </a>
    </template>

  </div>
</template>
