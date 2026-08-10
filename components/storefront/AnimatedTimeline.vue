<script setup lang="ts">
type TimelineItem = { year: string; title: string; description: string; icon: string }
defineProps<{
  headline?: string
  subheadline?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  items?: TimelineItem[]
}>()
</script>
<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div style="max-width:800px;margin:0 auto;">
      <div v-if="headline || subheadline" style="text-align:center;margin-bottom:56px;">
        <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '32px', fontWeight: 800, margin: '0 0 12px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor || '#1e293b', opacity: 0.65, fontSize: '17px', margin: 0 }">{{ subheadline }}</p>
      </div>
      <div style="position:relative;">
        <div :style="{ position: 'absolute', left: '19px', top: 0, bottom: 0, width: '2px', backgroundColor: accentColor || '#2563eb', opacity: 0.2 }" />
        <div style="display:flex;flex-direction:column;gap:40px;">
          <div v-for="(item, i) in (items?.length ? items : [{year:'2020',title:'Founded',description:'Started with a vision to change the industry.',icon:'🚀'},{year:'2022',title:'Growth',description:'Expanded to new markets and doubled our team.',icon:'📈'},{year:'2024',title:'Today',description:'Serving thousands of happy customers worldwide.',icon:'🌍'}])" :key="i" style="display:flex;gap:24px;align-items:flex-start;">
            <div :style="{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: accentColor || '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px', zIndex: 1 }">
              {{ item.icon }}
            </div>
            <div style="flex:1;padding-top:6px;">
              <span :style="{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', color: accentColor || '#2563eb', textTransform: 'uppercase' }">{{ item.year }}</span>
              <h3 :style="{ color: textColor || '#1e293b', fontSize: '18px', fontWeight: 700, margin: '4px 0 8px' }">{{ item.title }}</h3>
              <p :style="{ color: textColor || '#1e293b', opacity: 0.7, fontSize: '15px', margin: 0, lineHeight: 1.6 }">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
