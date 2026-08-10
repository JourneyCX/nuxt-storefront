<script setup lang="ts">
type Bar = { label: string; value: number; color: string }
defineProps<{
  headline?: string
  subheadline?: string
  bars?: Bar[]
  backgroundColor?: string
  textColor?: string
  showValues?: boolean
  animated?: boolean
}>()
</script>
<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div style="max-width:800px;margin:0 auto;">
      <div v-if="headline || subheadline" style="margin-bottom:40px;">
        <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '32px', fontWeight: 800, margin: '0 0 12px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor || '#1e293b', opacity: 0.65, fontSize: '17px', margin: 0 }">{{ subheadline }}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:24px;">
        <div v-for="(bar, i) in (bars?.length ? bars : [{label:'Skill One',value:85,color:'#2563eb'},{label:'Skill Two',value:72,color:'#16a34a'},{label:'Skill Three',value:90,color:'#9333ea'}])" :key="i">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span :style="{ fontWeight: 600, fontSize: '15px', color: textColor || '#1e293b' }">{{ bar.label }}</span>
            <span v-if="showValues !== false" :style="{ fontSize: '14px', fontWeight: 700, color: bar.color }">{{ bar.value }}%</span>
          </div>
          <div style="background:#e2e8f0;border-radius:999px;height:10px;overflow:hidden;">
            <div :style="{ height: '100%', borderRadius: '999px', backgroundColor: bar.color, width: `${Math.min(100, Math.max(0, bar.value))}%`, transition: 'width 0.8s ease' }" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
