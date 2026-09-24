<script setup lang="ts">
// Mirrors studio-app/src/components/Layout/ParallaxSection.tsx prop-for-prop —
// see that file for the full rationale (MAX_SHIFT_PX buffer, getBoundingClientRect
// needing no separate scrollY, prefers-reduced-motion guard). No iframe realm
// split here (this is the live top-level page), but onMounted/onUnmounted is
// still used for the window/scroll-listener access per this repo's established
// SSR-safety idiom (see HeroSlider.vue, ParticleBackground.vue, etc.).
const props = defineProps<{
  backgroundImage?: string
  backgroundSpeed?: number
  midgroundImage?: string
  midgroundSpeed?: number
  overlayColor?: string
  overlayOpacity?: number
  minHeight?: number
  contentAlign?: 'top' | 'center' | 'bottom'
  contentMaxWidth?: number
}>()

const MAX_SHIFT_PX = 80

const containerEl = ref<HTMLElement | null>(null)
const bgLayerEl = ref<HTMLElement | null>(null)
const midLayerEl = ref<HTMLElement | null>(null)

const hasMidground = computed(() => !!props.midgroundImage)

function hexToRgb(hex: string) {
  const r = parseInt((hex || '#000000').slice(1, 3), 16)
  const g = parseInt((hex || '#000000').slice(3, 5), 16)
  const b = parseInt((hex || '#000000').slice(5, 7), 16)
  return isNaN(r) ? '0,0,0' : `${r},${g},${b}`
}

function layerStyle(image?: string) {
  return {
    position: 'absolute' as const,
    top: `-${MAX_SHIFT_PX}px`,
    bottom: `-${MAX_SHIFT_PX}px`,
    left: 0,
    right: 0,
    backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    willChange: 'transform',
  }
}

let removeListeners: (() => void) | null = null

onMounted(() => {
  const win = containerEl.value?.ownerDocument?.defaultView
  if (!win) return
  if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let ticking = false
  function apply(layer: HTMLElement | null, speed: number, top: number) {
    if (!layer) return
    const factor = (speed / 100) * 0.5
    const clamped = Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, top * factor))
    layer.style.transform = `translate3d(0, ${clamped}px, 0)`
  }
  function update() {
    ticking = false
    const container = containerEl.value
    if (!container) return
    const rect = container.getBoundingClientRect()
    apply(bgLayerEl.value, props.backgroundSpeed ?? 30, rect.top)
    apply(midLayerEl.value, props.midgroundSpeed ?? 60, rect.top)
  }
  function onScroll() {
    if (!ticking) {
      ticking = true
      win!.requestAnimationFrame(update)
    }
  }
  update()
  win.addEventListener('scroll', onScroll, { passive: true })
  win.addEventListener('resize', onScroll)
  removeListeners = () => {
    win.removeEventListener('scroll', onScroll)
    win.removeEventListener('resize', onScroll)
  }
})

onUnmounted(() => {
  removeListeners?.()
})
</script>

<template>
  <div
    ref="containerEl"
    :style="{
      position: 'relative',
      minHeight: `${minHeight ?? 480}px`,
      overflow: 'hidden',
      display: 'flex',
      alignItems: contentAlign === 'top' ? 'flex-start' : contentAlign === 'bottom' ? 'flex-end' : 'center',
      justifyContent: 'center',
    }"
  >
    <div ref="bgLayerEl" :style="layerStyle(backgroundImage)" />
    <div v-if="hasMidground" ref="midLayerEl" :style="layerStyle(midgroundImage)" />
    <div :style="{ position: 'absolute', inset: 0, backgroundColor: `rgba(${hexToRgb(overlayColor)},${(overlayOpacity ?? 30) / 100})` }" />
    <div :style="{ position: 'relative', zIndex: 2, width: '100%', maxWidth: `${contentMaxWidth ?? 800}px`, margin: '0 auto', padding: '64px 24px' }">
      <slot />
    </div>
  </div>
</template>
