<script setup lang="ts">
import type { GiftWrapConfig } from '~/server/utils/stratum'

// "Gift wrap this" tick-box on the product page. Renders nothing unless the
// merchant has turned gift wrapping on (Store Builder → Payment). The parent
// adds config.productId to the cart alongside the product when ticked --
// see addGiftWrap() in ProductDetail.vue / DefaultProductDetail.vue.
const props = defineProps<{ config: GiftWrapConfig | null; currencySymbol?: string }>()
const checked = defineModel<boolean>({ default: false })

const priceLabel = computed(() => {
  const p = props.config?.price ?? 0
  return `${props.currencySymbol || 'R'} ${p.toFixed(2)}`
})
</script>

<template>
  <label
    v-if="config?.enabled"
    style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:15px;color:#2d3748"
  >
    <input v-model="checked" type="checkbox" style="width:18px;height:18px;cursor:pointer">
    <span>🎁 {{ config.label }} <span style="color:#718096">(+{{ priceLabel }} each)</span></span>
  </label>
</template>
