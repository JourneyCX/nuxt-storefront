<script setup lang="ts">
defineProps<{
  address?: string
  embedUrl?: string
  height?: number
  borderRadius?: number
  headline?: string
  backgroundColor?: string
  textColor?: string
}>()
</script>
<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '48px 24px' }">
    <div style="max-width:1200px;margin:0 auto;">
      <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '28px', fontWeight: 800, margin: '0 0 24px' }">{{ headline }}</h2>
      <div :style="{ borderRadius: `${borderRadius || 12}px`, overflow: 'hidden', height: `${height || 400}px`, backgroundColor: '#e2e8f0' }">
        <iframe v-if="embedUrl" :src="embedUrl" width="100%" :height="height || 400" style="border:0;display:block;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
        <div v-else style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#64748b;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style="font-size:14px;">{{ address || 'Add a Google Maps Embed URL in the editor' }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
