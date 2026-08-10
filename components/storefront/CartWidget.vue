<script setup lang="ts">
defineProps<{
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  label?: string
  cartUrl?: string
}>()
</script>
<template>
  <div :style="{ backgroundColor: backgroundColor || 'transparent', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end' }">
    <a :href="cartUrl || '/cart'" :style="{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: textColor || '#1e293b', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" :stroke="accentColor || '#1e293b'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      <span v-if="label">{{ label }}</span>
    </a>
  </div>
</template>
