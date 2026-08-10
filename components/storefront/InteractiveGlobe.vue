<script setup lang="ts">
defineProps<{
  headline?: string
  subheadline?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  stats?: Array<{ label: string; value: string }>
}>()
</script>
<template>
  <section :style="{ backgroundColor: backgroundColor || '#0f172a', padding: '72px 24px' }">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;">
      <div>
        <h2 v-if="headline" :style="{ color: textColor || '#fff', fontSize: '36px', fontWeight: 800, margin: '0 0 20px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor ? textColor + 'cc' : 'rgba(255,255,255,0.7)', fontSize: '18px', margin: '0 0 40px', lineHeight: 1.65 }">{{ subheadline }}</p>
        <div v-if="stats?.length" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div v-for="(s, i) in stats" :key="i">
            <div :style="{ fontSize: '36px', fontWeight: 800, color: accentColor || '#3b82f6', marginBottom: '4px' }">{{ s.value }}</div>
            <div :style="{ fontSize: '14px', color: textColor ? textColor + '99' : 'rgba(255,255,255,0.6)' }">{{ s.label }}</div>
          </div>
        </div>
      </div>
      <div :style="{ width: '100%', aspectRatio: '1/1', borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${accentColor || '#3b82f6'}44 0%, ${accentColor || '#3b82f6'}11 60%, transparent 100%)`, border: `2px solid ${accentColor || '#3b82f6'}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }">
        🌍
      </div>
    </div>
  </section>
</template>
