<script setup lang="ts">
// Mirrors studio-app/src/components/Media/ScrollingText.tsx prop-for-prop —
// see that file for the rationale (measured sequence width drives a
// one-sequence translate so the duplicated copy loops seamlessly; speed is
// px/sec so long and short phrases move at the same pace). Measurement runs
// in onMounted per this repo's SSR-safety idiom — the server render shows
// the static first copies, animation starts once measured on the client.
const props = withDefaults(defineProps<{
  items?: { text: string }[]
  separator?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  uppercase?: boolean
  letterSpacing?: number
  textStyle?: 'fill' | 'outline'
  textColor?: string
  direction?: 'left' | 'right'
  speed?: number
  pauseOnHover?: boolean
  backgroundType?: 'color' | 'image'
  backgroundColor?: string
  backgroundImage?: string
  backgroundPosition?: string
  overlayColor?: string
  overlayOpacity?: number
  minHeight?: number
  paddingY?: number
  verticalAlign?: 'top' | 'center' | 'bottom'
  buttonText?: string
  buttonUrl?: string
  buttonBgColor?: string
  buttonTextColor?: string
}>(), {
  items: () => [],
  separator: '',
  fontFamily: '',
  fontSize: 140,
  fontWeight: '800',
  uppercase: true,
  letterSpacing: 0,
  textStyle: 'fill',
  textColor: '#111111',
  direction: 'left',
  speed: 80,
  pauseOnHover: false,
  backgroundType: 'color',
  backgroundColor: '#f5f5f5',
  backgroundImage: '',
  backgroundPosition: 'center',
  overlayColor: '#000000',
  overlayOpacity: 0,
  minHeight: 0,
  paddingY: 24,
  verticalAlign: 'center',
  buttonText: '',
  buttonUrl: '',
  buttonBgColor: '#ffffff',
  buttonTextColor: '#000000',
})

const outerEl = ref<HTMLElement | null>(null)
const seqEls = ref<HTMLElement[]>([])
const seqWidth = ref(0)
const copies = ref(2)

const list = computed(() => {
  const phrases = (props.items ?? []).map(i => i?.text).filter((t): t is string => !!t && t.trim() !== '')
  return phrases.length ? phrases : ['Your text here']
})

function hexToRgb(hex: string) {
  const r = parseInt((hex || '#000000').slice(1, 3), 16)
  const g = parseInt((hex || '#000000').slice(3, 5), 16)
  const b = parseInt((hex || '#000000').slice(5, 7), 16)
  return isNaN(r) ? '0,0,0' : `${r},${g},${b}`
}

// Full size at >=1440px wide, proportionally smaller below, never under 28px.
function responsiveFontSize(px: number) {
  const size = px > 0 ? px : 120
  return `max(28px, min(${size}px, ${(size / 14.4).toFixed(3)}vw))`
}

const isImage = computed(() => props.backgroundType === 'image')
const duration = computed(() => (seqWidth.value > 0 ? seqWidth.value / (props.speed > 0 ? props.speed : 80) : 30))

const outerStyle = computed(() => ({
  position: 'relative' as const,
  overflow: 'hidden',
  minHeight: props.minHeight > 0 ? `${props.minHeight}px` : undefined,
  padding: `${props.paddingY ?? 24}px 0`,
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: props.verticalAlign === 'top' ? 'flex-start' : props.verticalAlign === 'bottom' ? 'flex-end' : 'center',
  backgroundColor: isImage.value ? '#1e293b' : (props.backgroundColor || 'transparent'),
}))

const trackStyle = computed(() => ({
  fontFamily: props.fontFamily || undefined,
  fontSize: responsiveFontSize(props.fontSize),
  fontWeight: props.fontWeight || '800',
  textTransform: (props.uppercase ? 'uppercase' : 'none') as 'uppercase' | 'none',
  letterSpacing: props.letterSpacing ? `${props.letterSpacing}px` : undefined,
  lineHeight: 1.05,
  whiteSpace: 'nowrap' as const,
  ...(props.textStyle === 'outline'
    ? { color: 'transparent', WebkitTextStroke: `2px ${props.textColor || '#000000'}` }
    : { color: props.textColor || '#000000' }),
  '--sb-mq-shift': `${seqWidth.value}px`,
  '--sb-mq-duration': `${duration.value}s`,
}))

let ro: ResizeObserver | null = null

function measure() {
  const outer = outerEl.value
  const seq = seqEls.value[0]
  if (!outer || !seq) return
  const w = seq.getBoundingClientRect().width
  const vw = outer.getBoundingClientRect().width
  if (w > 0) {
    seqWidth.value = w
    copies.value = Math.max(2, Math.ceil(vw / w) + 1)
  }
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(measure)
    if (outerEl.value) ro.observe(outerEl.value)
    if (seqEls.value[0]) ro.observe(seqEls.value[0])
  }
  document.fonts?.ready.then(measure).catch(() => {})
})

watch(() => [list.value.join('\u0000'), props.separator, props.fontFamily, props.fontSize, props.fontWeight, props.uppercase, props.letterSpacing], () => nextTick(measure))

onUnmounted(() => { ro?.disconnect() })
</script>

<template>
  <div
    ref="outerEl"
    class="sb-marquee"
    :data-dir="direction === 'right' ? 'right' : 'left'"
    :data-pause="pauseOnHover ? '1' : '0'"
    :style="outerStyle"
  >
    <template v-if="isImage">
      <div :style="{ position: 'absolute', inset: 0, backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined, backgroundSize: 'cover', backgroundPosition: backgroundPosition || 'center' }" />
      <div :style="{ position: 'absolute', inset: 0, backgroundColor: `rgba(${hexToRgb(overlayColor)},${(overlayOpacity ?? 0) / 100})` }" />
    </template>
    <div style="position: relative; z-index: 1">
      <div class="sb-marquee-track" :style="trackStyle">
        <div
          v-for="c in copies"
          :key="c"
          ref="seqEls"
          :aria-hidden="c === 1 ? undefined : 'true'"
          style="display: flex; align-items: center; flex-shrink: 0"
        >
          <span v-for="(t, i) in list" :key="i" style="display: inline-flex; align-items: center">
            <span style="padding-right: 0.4em">{{ t }}</span>
            <span v-if="separator" style="padding-right: 0.4em">{{ separator }}</span>
          </span>
        </div>
      </div>
    </div>
    <div v-if="buttonText" style="position: relative; z-index: 1; text-align: center; margin-top: 24px">
      <a
        :href="buttonUrl || '#'"
        :style="{ display: 'inline-block', padding: '14px 28px', borderRadius: '6px', backgroundColor: buttonBgColor || '#ffffff', color: buttonTextColor || '#000000', fontSize: '13px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }"
      >{{ buttonText }}</a>
    </div>
  </div>
</template>

<style>
@keyframes sb-marquee-scroll {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(calc(-1 * var(--sb-mq-shift, 0px)), 0, 0); }
}
.sb-marquee-track {
  display: flex;
  width: max-content;
  will-change: transform;
  animation: sb-marquee-scroll var(--sb-mq-duration, 30s) linear infinite;
}
.sb-marquee[data-dir="right"] .sb-marquee-track { animation-direction: reverse; }
.sb-marquee[data-pause="1"]:hover .sb-marquee-track { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .sb-marquee-track { animation: none; }
}
</style>
