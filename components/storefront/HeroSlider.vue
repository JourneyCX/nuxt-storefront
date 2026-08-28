<script setup lang="ts">
type ButtonPosition = 'inline' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right'

type Slide = {
  image?: string
  headline?: string
  subheadline?: string
  buttonText?: string
  buttonUrl?: string
  buttonColor?: string
  buttonStyle?: 'solid' | 'outline'
  buttonPosition?: ButtonPosition
  slideClickable?: boolean
  textAlign?: string
  overlayOpacity?: number
  backgroundSize?: string
  backgroundPosition?: string
}

const props = defineProps<{
  slides?: Slide[]
  minHeight?: number
  autoPlay?: boolean
  autoPlayInterval?: number
  showDots?: boolean
  showArrows?: boolean
}>()

const current = ref(0)
const total = computed(() => props.slides?.length || 1)

function next() { current.value = (current.value + 1) % total.value }
function prev() { current.value = (current.value - 1 + total.value) % total.value }

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.autoPlay !== false && total.value > 1) {
    timer = setInterval(next, props.autoPlayInterval || 5000)
  }
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const slide = computed(() => props.slides?.[current.value] ?? props.slides?.[0] ?? {} as Slide)
const height = computed(() => props.minHeight || 520)
const overlay = computed(() => (slide.value.overlayOpacity ?? 45) / 100)
const align = computed(() => slide.value.textAlign || 'left')
const justify = computed(() => align.value === 'center' ? 'center' : align.value === 'right' ? 'flex-end' : 'flex-start')
const btnPos = computed<ButtonPosition>(() => (slide.value.buttonPosition || 'inline') as ButtonPosition)
const isPositioned = computed(() => btnPos.value !== 'inline')

const absoluteBtnStyle = computed(() => {
  const map: Record<ButtonPosition, object> = {
    'inline':        {},
    'bottom-left':   { position: 'absolute', bottom: '40px', left: '48px', zIndex: 3 },
    'bottom-center': { position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 3 },
    'bottom-right':  { position: 'absolute', bottom: '40px', right: '48px', zIndex: 3 },
    'top-left':      { position: 'absolute', top: '40px', left: '48px', zIndex: 3 },
    'top-center':    { position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 3 },
    'top-right':     { position: 'absolute', top: '40px', right: '48px', zIndex: 3 },
  }
  return map[btnPos.value] ?? {}
})

function btnStyle(s: Slide) {
  const col = s.buttonColor || '#ffffff'
  const isOutline = (s.buttonStyle || 'outline') === 'outline'
  return {
    display: 'inline-block',
    backgroundColor: isOutline ? 'transparent' : col,
    color: isOutline ? col : '#1a202c',
    border: `2px solid ${col}`,
    padding: '13px 32px',
    borderRadius: '2px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  }
}

function stopProp(e: Event) { e.stopPropagation() }
</script>

<template>
  <!-- Whole-slide link wrapper when slideClickable -->
  <component
    :is="slide.slideClickable ? 'a' : 'div'"
    :href="slide.slideClickable ? (slide.buttonUrl || '#') : undefined"
    :style="{
      display: 'block', textDecoration: 'none',
      position: 'relative', minHeight: `${height}px`,
      overflow: 'hidden', userSelect: 'none',
      cursor: slide.slideClickable ? 'pointer' : 'default',
    }"
  >
    <!-- Background -->
    <div :style="{
      position:'absolute', inset:0,
      backgroundImage: slide.image ? `url(${slide.image})` : undefined,
      backgroundColor: slide.image ? undefined : '#1a202c',
      backgroundSize: slide.backgroundSize || 'cover',
      backgroundPosition: slide.backgroundPosition || 'center',
      backgroundRepeat: 'no-repeat',
    }" />
    <!-- Overlay -->
    <div :style="{ position:'absolute', inset:0, backgroundColor:`rgba(0,0,0,${overlay})` }" />

    <!-- Text content -->
    <div :style="{
      position:'relative', zIndex:2, minHeight:`${height}px`,
      display:'flex', alignItems:'center',
      justifyContent: justify,
      padding:'60px 48px',
      textAlign: align as any,
    }">
      <div style="max-width:700px">
        <!-- sb-text-fluid-lg (assets/css/responsive.css) scales this down on
             narrow screens instead of staying fixed at 52px. -->
        <h1
          v-if="slide.headline"
          class="sb-text-fluid-lg"
          style="color:#fff;font-weight:800;margin:0 0 18px;line-height:1.12;text-shadow:0 2px 8px rgba(0,0,0,0.4)"
        >{{ slide.headline }}</h1>
        <p
          v-if="slide.subheadline"
          :style="{ color:'rgba(255,255,255,0.88)', fontSize:'20px', margin: isPositioned ? '0' : '0 0 36px', lineHeight:1.6, textShadow:'0 1px 4px rgba(0,0,0,0.35)' }"
        >{{ slide.subheadline }}</p>

        <!-- Inline button -->
        <a
          v-if="slide.buttonText && !slide.slideClickable && !isPositioned"
          :href="slide.buttonUrl || '#'"
          :style="btnStyle(slide)"
        >{{ slide.buttonText }}</a>
      </div>
    </div>

    <!-- Absolutely positioned button -->
    <a
      v-if="slide.buttonText && !slide.slideClickable && isPositioned"
      :href="slide.buttonUrl || '#'"
      :style="{ ...btnStyle(slide), ...absoluteBtnStyle }"
      @click.stop
    >{{ slide.buttonText }}</a>

    <!-- Arrows -->
    <template v-if="showArrows !== false && total > 1">
      <button
        @click.prevent.stop="prev"
        :style="{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', zIndex:4, background:'rgba(0,0,0,0.45)', border:'none', borderRadius:'50%', width:'44px', height:'44px', cursor:'pointer', color:'#fff', fontSize:'24px', display:'flex', alignItems:'center', justifyContent:'center' }"
      >‹</button>
      <button
        @click.prevent.stop="next"
        :style="{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', zIndex:4, background:'rgba(0,0,0,0.45)', border:'none', borderRadius:'50%', width:'44px', height:'44px', cursor:'pointer', color:'#fff', fontSize:'24px', display:'flex', alignItems:'center', justifyContent:'center' }"
      >›</button>
    </template>

    <!-- Dots -->
    <div
      v-if="showDots !== false && total > 1"
      :style="{ position:'absolute', bottom:'20px', left:0, right:0, zIndex:4, display:'flex', justifyContent:'center', gap:'8px' }"
    >
      <button
        v-for="(_, i) in slides"
        :key="i"
        @click.prevent.stop="current = i"
        :style="{
          width: i === current ? '28px' : '10px', height:'10px',
          borderRadius:'5px', border:'none', cursor:'pointer', padding:0,
          backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.5)',
          transition:'width 0.25s ease',
        }"
      />
    </div>
  </component>
</template>
