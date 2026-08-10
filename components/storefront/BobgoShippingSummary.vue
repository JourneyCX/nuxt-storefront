<script setup lang="ts">
defineProps<{
  headline?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
}>()
</script>
<template>
  <div :style="{ backgroundColor: backgroundColor || '#f8fafc', padding: '20px 24px', borderRadius: '12px', border: '1px solid #e2e8f0' }">
    <h3 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '15px', fontWeight: 700, margin: '0 0 16px' }">{{ headline || 'Shipping Summary' }}</h3>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;font-size:14px;">
        <span :style="{ color: textColor || '#1e293b', opacity: 0.7 }">Method</span>
        <span :style="{ color: textColor || '#1e293b', fontWeight: 600 }">Standard Delivery</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;">
        <span :style="{ color: textColor || '#1e293b', opacity: 0.7 }">Estimated delivery</span>
        <span :style="{ color: textColor || '#1e293b', fontWeight: 600 }">3–5 business days</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:10px;border-top:1px solid #e2e8f0;">
        <span :style="{ color: textColor || '#1e293b', fontWeight: 700 }">Shipping cost</span>
        <span :style="{ color: accentColor || '#2563eb', fontWeight: 800, fontSize: '16px' }">R 65</span>
      </div>
    </div>
  </div>
</template>
