<script setup lang="ts">
const props = defineProps<{
  videoType?: 'mp4' | 'youtube'
  videoUrl?: string
  fallbackImage?: string
  overlayColor?: string
  overlayOpacity?: number
  minHeight?: number
  headline?: string
  subheadline?: string
  primaryButtonText?: string
  primaryButtonUrl?: string
  primaryButtonColor?: string
  secondaryButtonText?: string
  secondaryButtonUrl?: string
  textAlign?: 'left' | 'center'
  // Accepted for schema parity with studio-app's VideoBackground.tsx and with stored
  // puck_json — not yet wired to actual mute control (the <video> below is
  // unconditionally muted), same as the editor's current behaviour.
  showMuteToggle?: boolean
}>()

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/\s]+)/)
  return m ? m[1] : ''
}

function hexToRgb(hex: string) {
  const r = parseInt((hex || '#000').slice(1, 3), 16)
  const g = parseInt((hex || '#000').slice(3, 5), 16)
  const b = parseInt((hex || '#000').slice(5, 7), 16)
  return isNaN(r) ? '0,0,0' : `${r},${g},${b}`
}

const ytId = computed(() => props.videoType === 'youtube' && props.videoUrl ? getYouTubeId(props.videoUrl) : '')
const hasMp4 = computed(() => props.videoType === 'mp4' && !!props.videoUrl)
const hasYt  = computed(() => props.videoType === 'youtube' && !!ytId.value)
</script>

<template>
  <div :style="{
    position: 'relative',
    minHeight: `${minHeight ?? 560}px`,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: textAlign === 'left' ? 'flex-start' : 'center',
    backgroundColor: '#0f172a',
  }">
    <!-- MP4 video -->
    <video v-if="hasMp4" autoplay muted loop playsinline
      style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
      <source :src="videoUrl" type="video/mp4" />
    </video>

    <!-- YouTube iframe -->
    <iframe v-else-if="hasYt"
      :src="`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0`"
      allow="autoplay; fullscreen"
      style="position:absolute;inset:0;width:100%;height:100%;border:none;transform:scale(1.1);" />

    <!-- Fallback image -->
    <img v-else-if="fallbackImage" :src="fallbackImage" alt=""
      style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />

    <!-- Overlay -->
    <div :style="{ position: 'absolute', inset: 0, backgroundColor: `rgba(${hexToRgb(overlayColor || '#000000')},${(overlayOpacity ?? 50) / 100})` }" />

    <!-- Content -->
    <div :style="{ position: 'relative', zIndex: 2, maxWidth: textAlign === 'left' ? '580px' : '700px', padding: '64px 40px', textAlign: textAlign || 'center' }">
      <h1 v-if="headline" style="color:#fff;font-size:clamp(32px,5vw,52px);font-weight:800;margin:0 0 20px;line-height:1.1;">{{ headline }}</h1>
      <p v-if="subheadline" style="color:rgba(255,255,255,0.82);font-size:19px;margin:0 0 40px;line-height:1.65;">{{ subheadline }}</p>
      <div :style="{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: textAlign === 'left' ? 'flex-start' : 'center' }">
        <a v-if="primaryButtonText" :href="primaryButtonUrl || '#'" :style="{ display: 'inline-block', backgroundColor: primaryButtonColor || '#fff', color: (primaryButtonColor === '#ffffff' || primaryButtonColor === '#fff') ? '#1e293b' : '#fff', padding: '14px 36px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '16px' }">
          {{ primaryButtonText }}
        </a>
        <a v-if="secondaryButtonText" :href="secondaryButtonUrl || '#'" style="display:inline-block;background:transparent;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;border:2px solid rgba(255,255,255,0.5);">
          {{ secondaryButtonText }}
        </a>
      </div>
    </div>
  </div>
</template>
