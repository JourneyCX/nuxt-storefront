<script setup lang="ts">
const props = defineProps<{
  eyebrow?: string
  headline?: string
  subheadline?: string
  primaryButtonText?: string
  primaryButtonUrl?: string
  primaryButtonColor?: string
  secondaryButtonText?: string
  secondaryButtonUrl?: string
  backgroundImage?: string
  backgroundColor?: string
  overlayOpacity?: number
  textAlign?: 'left' | 'center'
  minHeight?: number
  textColor?: string
}>()

const resolvedTextColor = computed(() => props.textColor || '#ffffff')
</script>

<template>
  <div :style="{
    position: 'relative',
    minHeight: `${minHeight ?? 560}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: textAlign === 'left' ? 'flex-start' : 'center',
    backgroundColor: backgroundImage ? undefined : (backgroundColor || '#0f172a'),
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '64px 24px',
    textAlign: textAlign || 'center',
  }">
    <div v-if="backgroundImage" :style="{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${(overlayOpacity ?? 50) / 100})` }" />
    <div :style="{ position: 'relative', zIndex: 1, maxWidth: textAlign === 'left' ? '560px' : '680px' }">
      <span v-if="eyebrow" :style="{
        display: 'inline-block',
        backgroundColor: primaryButtonColor || '#2563eb',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '4px 12px',
        borderRadius: '20px',
        marginBottom: '20px',
      }">{{ eyebrow }}</span>
      <h1 v-if="headline" :style="{ color: resolvedTextColor, fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.12 }">{{ headline }}</h1>
      <p v-if="subheadline" :style="{ color: resolvedTextColor, opacity: 0.8, fontSize: '19px', margin: '0 0 36px', lineHeight: 1.65 }">{{ subheadline }}</p>
      <div :style="{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: textAlign === 'left' ? 'flex-start' : 'center' }">
        <a v-if="primaryButtonText" :href="primaryButtonUrl || '#'" :style="{ display: 'inline-block', backgroundColor: primaryButtonColor || '#2563eb', color: '#fff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '16px' }">
          {{ primaryButtonText }}
        </a>
        <a v-if="secondaryButtonText" :href="secondaryButtonUrl || '#'" :style="{ display: 'inline-block', background: 'transparent', color: resolvedTextColor, padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '16px', border: `2px solid ${resolvedTextColor}` }">
          {{ secondaryButtonText }}
        </a>
      </div>
    </div>
  </div>
</template>
