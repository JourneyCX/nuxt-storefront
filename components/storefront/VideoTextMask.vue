<script setup lang="ts">
// Knockout text: video visible only through the letters. Keep in sync with
// studio-app/src/components/Media/VideoTextMask.tsx (see the technique note there).
const props = defineProps<{
  videoType?: 'mp4' | 'youtube'
  videoUrl?: string
  fallbackImage?: string
  text?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  textTransform?: 'none' | 'uppercase'
  textAlign?: 'left' | 'center' | 'right'
  minHeight?: number
  surround?: 'light' | 'dark'
  linkUrl?: string
}>()

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/\s]+)/)
  return m ? m[1] : ''
}

const ytId   = computed(() => props.videoType === 'youtube' && props.videoUrl ? getYouTubeId(props.videoUrl) : '')
const hasMp4 = computed(() => (props.videoType ?? 'mp4') === 'mp4' && !!props.videoUrl)
const hasYt  = computed(() => props.videoType === 'youtube' && !!ytId.value)
const light  = computed(() => props.surround !== 'dark')
const size   = computed(() => props.fontSize || 240)
// min(): the px size on desktop, scaled by viewport width below ~1280px so it fits a phone.
const fontSizeCss = computed(() => `min(${size.value}px, ${(size.value / 12.8).toFixed(2)}vw)`)
const justify = computed(() => props.textAlign === 'left' ? 'flex-start' : props.textAlign === 'right' ? 'flex-end' : 'center')
</script>

<template>
  <component :is="linkUrl ? 'a' : 'div'" :href="linkUrl || undefined" style="display:block;text-decoration:none;">
    <div :style="{ position: 'relative', isolation: 'isolate', overflow: 'hidden', minHeight: `${minHeight || 320}px`, backgroundColor: light ? '#fff' : '#000' }">
      <video v-if="hasMp4" autoplay muted loop playsinline
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
        <source :src="videoUrl" type="video/mp4" />
      </video>

      <iframe v-else-if="hasYt"
        :src="`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&iv_load_policy=3`"
        allow="autoplay; fullscreen"
        style="position:absolute;inset:0;width:100%;height:100%;border:none;transform:scale(1.5);pointer-events:none;" />

      <img v-else-if="fallbackImage" :src="fallbackImage" alt=""
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />

      <!-- The mask: solid surround + text in the opposite tone, blended onto the video. -->
      <div role="img" :aria-label="text"
        :style="{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: justify,
          backgroundColor: light ? '#fff' : '#000',
          color: light ? '#000' : '#fff',
          mixBlendMode: light ? 'screen' : 'multiply',
          fontSize: fontSizeCss, fontWeight: fontWeight || 900, letterSpacing: `${letterSpacing || 0}px`,
          textTransform: textTransform || 'none',
          lineHeight: 1, textAlign: textAlign || 'center', padding: '0 2%', overflow: 'hidden',
        }">
        <span style="white-space:nowrap;">{{ text }}</span>
      </div>
    </div>
  </component>
</template>
