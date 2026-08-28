<script setup lang="ts">
const props = defineProps<{
  headline?: string
  subheadline?: string
  columns?: 2 | 3 | 4
  cardStyle?: 'boxed' | 'minimal' | 'icon-top'
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  items?: Array<{ icon: string; title: string; description: string }>
}>()

const cols = computed(() => props.columns || 3)
const style = computed(() => props.cardStyle || 'boxed')
const accent = computed(() => props.accentColor || '#2563eb')
const bg = computed(() => props.backgroundColor || '#ffffff')
const text = computed(() => props.textColor || '#1e293b')

function cardStyle(i: number) {
  const isBoxed = style.value === 'boxed'
  const isCentre = style.value === 'icon-top'
  return {
    padding: '32px',
    borderRadius: '12px',
    textAlign: (isCentre ? 'center' : 'left') as 'center' | 'left',
    border: isBoxed ? `1px solid ${text.value}22` : 'none',
    backgroundColor: isBoxed ? '#fff' : 'transparent',
    boxShadow: isBoxed ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
  }
}
</script>

<template>
  <section :style="{ backgroundColor: bg, padding: '72px 24px' }">
    <div :style="{ maxWidth: '1200px', margin: '0 auto' }">
      <div v-if="headline || subheadline" :style="{ textAlign: 'center', marginBottom: '56px' }">
        <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color: text, fontWeight: 800, margin: '0 0 16px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: text, opacity: 0.7, fontSize: '18px', margin: 0, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }">{{ subheadline }}</p>
      </div>
      <!-- sb-grid collapses this to 1 column on mobile / 2 on tablet regardless of the merchant's chosen column count -->
      <div class="sb-grid" :style="{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '24px' }">
        <div v-for="(item, i) in (items || [])" :key="i" :style="cardStyle(i)">
          <div v-if="item.icon" :style="{ fontSize: '36px', marginBottom: '16px', color: accent }">{{ item.icon }}</div>
          <h3 :style="{ color: text, fontSize: '20px', fontWeight: 700, margin: '0 0 10px' }">{{ item.title }}</h3>
          <p :style="{ color: text, opacity: 0.7, fontSize: '15px', margin: 0, lineHeight: 1.65 }">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
