<script setup lang="ts">
// Mirrors studio-app/src/components/Layout/ParallaxSection.tsx prop-for-prop —
// see that file for the full rationale (MAX_SHIFT_PX buffer, getBoundingClientRect
// needing no separate scrollY, prefers-reduced-motion guard, why Midground is a
// sized/positioned <img>, and how Sticky Reveal mode needs no scroll-linked JS
// at all — position:sticky does all the work). No iframe realm split here
// (this is the live top-level page), but onMounted/onUnmounted is still used
// for the drift-mode window/scroll-listener access per this repo's
// established SSR-safety idiom (see HeroSlider.vue, ParticleBackground.vue).
type MidgroundPosition = 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
type ScrollMode = 'drift' | 'sticky'

const props = defineProps<{
  scrollMode?: ScrollMode
  stickyScrollLength?: number
  backgroundImage?: string
  backgroundSpeed?: number
  midgroundImage?: string
  midgroundSpeed?: number
  midgroundWidth?: number
  midgroundPosition?: MidgroundPosition
  overlayColor?: string
  overlayOpacity?: number
  minHeight?: number
  contentAlign?: 'top' | 'center' | 'bottom'
  contentMaxWidth?: number
  forceAnimation?: boolean
}>()

const MAX_SHIFT_PX = 80
const MIDGROUND_MAX_SHIFT_PX = 150

const isSticky = computed(() => props.scrollMode === 'sticky')
const hasMidground = computed(() => !!props.midgroundImage)

const containerEl = ref<HTMLElement | null>(null)
const bgLayerEl = ref<HTMLElement | null>(null)
const midLayerEl = ref<HTMLElement | null>(null)

function hexToRgb(hex: string) {
  const r = parseInt((hex || '#000000').slice(1, 3), 16)
  const g = parseInt((hex || '#000000').slice(3, 5), 16)
  const b = parseInt((hex || '#000000').slice(5, 7), 16)
  return isNaN(r) ? '0,0,0' : `${r},${g},${b}`
}

function backgroundFillStyle(image?: string) {
  return {
    backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

// Drift mode only — Sticky mode always centres its travelling image.
function midgroundAnchorStyle(position: MidgroundPosition, width: number) {
  const base = { position: 'absolute' as const, willChange: 'transform', pointerEvents: 'none' as const, width: `${width}px`, height: 'auto', display: 'block' }
  switch (position) {
    case 'top-left':      return { ...base, top: '24px', left: '24px' }
    case 'top-center':    return { ...base, top: '24px', left: '50%' }
    case 'top-right':     return { ...base, top: '24px', right: '24px' }
    case 'bottom-left':   return { ...base, bottom: '24px', left: '24px' }
    case 'bottom-center': return { ...base, bottom: '24px', left: '50%' }
    case 'bottom-right':  return { ...base, bottom: '24px', right: '24px' }
    case 'center':
    default:               return { ...base, top: '50%', left: '50%' }
  }
}

// Anchors placed at left:50% (center, top-center, bottom-center) need their
// own horizontal-centring transform composed with the scroll-driven
// translateY rather than overwritten by it — translateX/Y() after
// translate(-50%, ...) simply adds to its own axis, so this composes
// correctly with no extra math needed.
function midgroundBaseTransform(position: MidgroundPosition) {
  switch (position) {
    case 'center':        return 'translate(-50%, -50%) '
    case 'top-center':
    case 'bottom-center': return 'translateX(-50%) '
    default:               return ''
  }
}

let removeListeners: (() => void) | null = null

onMounted(() => {
  if (isSticky.value) return // Sticky Reveal needs no scroll-linked JS at all
  const win = containerEl.value?.ownerDocument?.defaultView
  if (!win) return
  if (!props.forceAnimation && win.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let ticking = false
  function update() {
    ticking = false
    const container = containerEl.value
    if (!container) return
    const rect = container.getBoundingClientRect()

    const bg = bgLayerEl.value
    if (bg) {
      const factor = (props.backgroundSpeed ?? 30) / 100 * 0.5
      const clamped = Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, rect.top * factor))
      bg.style.transform = `translate3d(0, ${clamped}px, 0)`
    }

    const mid = midLayerEl.value
    if (mid) {
      const factor = (props.midgroundSpeed ?? 60) / 100 * 0.5
      const clamped = Math.max(-MIDGROUND_MAX_SHIFT_PX, Math.min(MIDGROUND_MAX_SHIFT_PX, rect.top * factor))
      mid.style.transform = `${midgroundBaseTransform(props.midgroundPosition ?? 'center')}translateY(${clamped}px)`
    }
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
  <!-- Sticky Reveal: a tall outer section contains a position:sticky inner
       layer pinned to the viewport top for the section's whole height, while
       the midground image sits at the outer section's own vertical midpoint
       — as the tall section scrolls by normally, that fixed point sweeps up
       through the viewport purely as a side effect of ordinary scrolling. -->
  <div v-if="isSticky" :style="{ position: 'relative', height: `${stickyScrollLength ?? 200}vh` }">
    <div :style="{
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      alignItems: contentAlign === 'top' ? 'flex-start' : contentAlign === 'bottom' ? 'flex-end' : 'center',
      justifyContent: 'center',
    }">
      <div :style="{ position: 'absolute', inset: 0, ...backgroundFillStyle(backgroundImage) }" />
      <div :style="{ position: 'absolute', inset: 0, backgroundColor: `rgba(${hexToRgb(overlayColor)},${(overlayOpacity ?? 30) / 100})` }" />
      <div :style="{ position: 'relative', zIndex: 2, width: '100%', maxWidth: `${contentMaxWidth ?? 800}px`, margin: '0 auto', padding: '64px 24px' }">
        <slot />
      </div>
    </div>
    <img
      v-if="hasMidground"
      :src="midgroundImage"
      alt=""
      :style="{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `${midgroundWidth ?? 300}px`, height: 'auto', zIndex: 3, pointerEvents: 'none' }"
    />
  </div>

  <!-- Depth Drift: normal-height section, both layers get a small extra
       scroll-linked offset applied via the ref-driven onMounted listener above. -->
  <div
    v-else
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
    <div ref="bgLayerEl" :style="{ position: 'absolute', top: `-${MAX_SHIFT_PX}px`, bottom: `-${MAX_SHIFT_PX}px`, left: 0, right: 0, willChange: 'transform', ...backgroundFillStyle(backgroundImage) }" />
    <img v-if="hasMidground" ref="midLayerEl" :src="midgroundImage" alt="" :style="midgroundAnchorStyle(midgroundPosition ?? 'center', midgroundWidth ?? 300)" />
    <div :style="{ position: 'absolute', inset: 0, backgroundColor: `rgba(${hexToRgb(overlayColor)},${(overlayOpacity ?? 30) / 100})` }" />
    <div :style="{ position: 'relative', zIndex: 2, width: '100%', maxWidth: `${contentMaxWidth ?? 800}px`, margin: '0 auto', padding: '64px 24px' }">
      <slot />
    </div>
  </div>
</template>
