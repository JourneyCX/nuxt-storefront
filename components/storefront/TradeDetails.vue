<script setup lang="ts">
// B2B Session 4: the extra trade facts under a product price: VAT wording, quantity rule, volume tiers, stock.
// Renders nothing for a retail visitor (no `trade` info on the product). Figures are Stratum's, passed through.
import type { TradeInfo } from '~/server/utils/woocommerce'

const props = defineProps<{ trade?: TradeInfo; symbol?: string }>()

const sym = computed(() => props.symbol ?? '')
const fmt = (v: string | number) => `${sym.value} ${Number(v).toFixed(2)}`.trim()
const rule = computed(() => props.trade?.quantityRule)
const ruleText = computed(() => {
  const r = rule.value
  if (!r) return ''
  const parts: string[] = []
  if (r.min && r.min > 1) parts.push(`minimum ${r.min}`)
  if (r.increment && r.increment > 1) parts.push(`in steps of ${r.increment}`)
  if (r.max) parts.push(`maximum ${r.max}`)
  return parts.length ? 'Order ' + parts.join(', ') : ''
})
const stockText = computed(() => {
  const s = props.trade?.stock
  if (!s) return ''
  if (s.status === 'out_of_stock') return 'Out of stock'
  if (s.status === 'in_stock') return s.available != null ? `${s.available} available` : 'In stock'
  return ''
})
</script>

<template>
  <div v-if="trade && trade.mode === 'trade'" style="margin:0 0 20px;font-size:14px;color:#4a5568">
    <p v-if="trade.vatNote" style="margin:0 0 6px;font-weight:600">Prices {{ trade.vatNote }}</p>
    <p v-if="ruleText" style="margin:0 0 6px">{{ ruleText }}</p>
    <p v-if="stockText" style="margin:0 0 6px">{{ stockText }}</p>
    <table v-if="trade.tiers && trade.tiers.length" style="border-collapse:collapse;margin-top:8px;font-size:13px">
      <caption style="text-align:left;font-weight:600;margin-bottom:4px">Volume prices</caption>
      <thead><tr><th style="text-align:left;padding:4px 12px 4px 0;border-bottom:1px solid #e2e8f0">Quantity</th><th style="text-align:left;padding:4px 0;border-bottom:1px solid #e2e8f0">Price each</th></tr></thead>
      <tbody>
        <tr v-for="t in trade.tiers" :key="t.min_qty"><td style="padding:4px 12px 4px 0">{{ t.min_qty }}+</td><td style="padding:4px 0">{{ fmt(t.price_excl) }}</td></tr>
      </tbody>
    </table>
  </div>
</template>
