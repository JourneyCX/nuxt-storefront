<script setup lang="ts">
defineProps<{
  headline?: string
  subheadline?: string
  primaryButtonText?: string
  primaryButtonUrl?: string
  primaryButtonColor?: string
  backgroundColor?: string
  particleColor?: string
  textColor?: string
  minHeight?: number
}>()
</script>
<template>
  <div :style="{
    position: 'relative',
    minHeight: `${minHeight ?? 500}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '64px 24px',
    background: backgroundColor ? `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor}cc 100%)` : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    overflow: 'hidden',
  }">
    <div style="position:absolute;inset:0;background-image:radial-gradient(circle at 25% 35%, rgba(59,130,246,0.2) 0%, transparent 50%), radial-gradient(circle at 75% 65%, rgba(139,92,246,0.15) 0%, transparent 50%);" />
    <div style="position:relative;z-index:1;max-width:680px;">
      <h1 v-if="headline" :style="{ color: textColor || '#fff', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.12 }">{{ headline }}</h1>
      <p v-if="subheadline" :style="{ color: textColor ? textColor + 'cc' : 'rgba(255,255,255,0.8)', fontSize: '19px', margin: '0 0 36px', lineHeight: 1.65 }">{{ subheadline }}</p>
      <a v-if="primaryButtonText" :href="primaryButtonUrl || '#'" :style="{ display: 'inline-block', backgroundColor: primaryButtonColor || '#2563eb', color: '#fff', padding: '14px 36px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '16px' }">
        {{ primaryButtonText }}
      </a>
    </div>
  </div>
</template>
