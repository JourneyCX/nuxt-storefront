<script setup lang="ts">
// B2B Session 4: shown INSTEAD of the quantity box and Add to Cart whenever buying is not offered on this product:
// Shop window (anonymous) and a signed-in trade buyer before the trade checkout exists. The server refuses the cart
// calls too (server/middleware/trade.ts); this is only the explanation.
import type { TradeInfo } from '~/server/utils/woocommerce'

defineProps<{ trade: TradeInfo }>()
</script>

<template>
  <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:24px;font-size:14px;color:#2d3748">
    <p style="margin:0">{{ trade.buyNote }}</p>
    <p v-if="trade.mode === 'window'" style="margin:8px 0 0">
      <a href="/trade/login" style="font-weight:600">Log in</a>
      <span style="margin:0 6px">or</span>
      <a href="/trade/apply" style="font-weight:600">apply for a trade account</a>
    </p>
  </div>
</template>
