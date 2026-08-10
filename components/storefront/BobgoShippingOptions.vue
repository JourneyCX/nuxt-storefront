<script setup lang="ts">
defineProps<{
  headline?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
}>()
</script>
<template>
  <div :style="{ backgroundColor: backgroundColor || '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }">
    <h3 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '16px', fontWeight: 700, margin: '0 0 16px' }">{{ headline || 'Shipping Options' }}</h3>
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div v-for="opt in [{label:'Standard Delivery (3-5 days)', price:'R 65'},{label:'Express Delivery (1-2 days)', price:'R 120'},{label:'Collection Point', price:'R 45'}]" :key="opt.label"
        style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="radio" name="shipping" :style="{ accentColor: accentColor || '#2563eb' }" />
          <span :style="{ fontSize: '14px', color: textColor || '#1e293b' }">{{ opt.label }}</span>
        </div>
        <span :style="{ fontSize: '14px', fontWeight: 700, color: textColor || '#1e293b' }">{{ opt.price }}</span>
      </div>
    </div>
  </div>
</template>
