<script setup lang="ts">
const props = defineProps<{
  headline?: string
  subheadline?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  unit?: string
  basePrice?: number
  pricePerUnit?: number
  minUnits?: number
  maxUnits?: number
}>()

const units = ref(1)
const total = computed(() =>
  ((props.basePrice ?? 0) + units.value * (props.pricePerUnit ?? 100)).toFixed(2)
)
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#f8fafc', padding: '64px 24px' }">
    <div style="max-width:600px;margin:0 auto;text-align:center;">
      <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '32px', fontWeight: 800, margin: '0 0 12px' }">{{ headline }}</h2>
      <p v-if="subheadline" :style="{ color: textColor || '#1e293b', opacity: 0.65, fontSize: '17px', margin: '0 0 40px' }">{{ subheadline }}</p>
      <div style="background:#fff;border-radius:16px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <label :style="{ display: 'block', fontSize: '15px', fontWeight: 600, color: textColor || '#1e293b', marginBottom: '12px' }">
          How many {{ unit || 'units' }}?
        </label>
        <input v-model.number="units" type="range" :min="minUnits || 1" :max="maxUnits || 100"
          :style="{ width: '100%', accentColor: accentColor || '#2563eb', marginBottom: '20px' }" />
        <div :style="{ fontSize: '48px', fontWeight: 800, marginBottom: '8px', color: accentColor || '#2563eb' }">
          R {{ total }}
        </div>
        <p :style="{ color: textColor || '#1e293b', opacity: 0.6, fontSize: '14px', margin: 0 }">
          For {{ units }} {{ unit || 'unit' }}{{ units !== 1 ? 's' : '' }}
        </p>
      </div>
    </div>
  </section>
</template>
