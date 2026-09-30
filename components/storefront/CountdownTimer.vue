<script setup lang="ts">
const props = defineProps<{
  targetDate?: string
  headline?: string
  subheadline?: string
  endMessage?: string
  showDays?: boolean
  showHours?: boolean
  showMinutes?: boolean
  showSeconds?: boolean
  cardStyle?: 'card' | 'minimal' | 'neon' | 'bar'
  accentColor?: string
  backgroundColor?: string
  backgroundImage?: string
  overlayOpacity?: number
  cardColor?: string
  headingColor?: string
  textColor?: string
  labelColor?: string
  digitScale?: number
  digitsOffsetY?: number
  primaryButtonText?: string
  primaryButtonUrl?: string
  // Internal only: set by ParallaxCountdown.vue, which supplies its own
  // section padding/background, so the timer drops its 72px padding.
  embedded?: boolean
  // Internal only (ParallaxCountdown): Timer Position — aligns the digits
  // (and the headline too unless headlineAlign differs). 'split' is the
  // legacy value = headline left, digits right. Mirrors CountdownTimer.tsx.
  align?: 'left' | 'center' | 'right' | 'split'
  // Internal only (ParallaxCountdown): Headline Position. Undefined = follow.
  headlineAlign?: 'left' | 'center' | 'right'
  // Internal only (ParallaxCountdown): vertical positions, undefined = centre.
  // Any difference from the timer switches to the full-section 3×3 grid.
  headlineVAlign?: 'top' | 'center' | 'bottom'
  timerVAlign?: 'top' | 'center' | 'bottom'
  // Internal only (ParallaxCountdown): false hides the ":" between boxes.
  showSeparators?: boolean
}>()

const accent = computed(() => props.accentColor || '#2563eb')
const bg = computed(() => props.backgroundColor || '#f8fafc')
const cardBg = computed(() => props.cardColor || '#ffffff')
const text = computed(() => props.textColor || '#1e293b')
const heading = computed(() => props.headingColor || '#1e293b')
const label = computed(() => props.labelColor || '#64748b')
const cs = computed(() => props.cardStyle || 'card')
const hasImage = computed(() => !!props.backgroundImage)
const overlay = computed(() => (props.overlayOpacity ?? 55) / 100)
const scale = computed(() => (props.digitScale || 100) / 100)
const px = (base: number) => Math.round(base * scale.value)
type HAlign = 'left' | 'center' | 'right'
const H_COLUMN: Record<HAlign, number> = { left: 1, center: 2, right: 3 }
const H_SELF: Record<HAlign, string> = { left: 'flex-start', center: 'center', right: 'flex-end' }
const align = computed(() => props.align || 'center')
const digitsPos = computed<HAlign>(() => align.value === 'split' ? 'right' : align.value)
const textPos = computed<HAlign>(() => props.headlineAlign ?? (align.value === 'split' ? 'left' : align.value))
type VAlign = 'top' | 'center' | 'bottom'
const V_ROW: Record<VAlign, number> = { top: 1, center: 2, bottom: 3 }
const V_SELF: Record<VAlign, string> = { top: 'start', center: 'center', bottom: 'end' }
const textV = computed<VAlign>(() => props.headlineVAlign || 'center')
const digitsV = computed<VAlign>(() => props.timerVAlign || 'center')
const gridMode = computed(() => textPos.value !== digitsPos.value || textV.value !== digitsV.value)
// Boolean props are cast to false when absent, so the plain Countdown Timer
// (which never passes this) is told explicitly via the embedded flag.
const separators = computed(() => !props.embedded || props.showSeparators !== false)
const stackMargin = computed(() => digitsPos.value === 'left' ? '0 auto 0 0' : digitsPos.value === 'right' ? '0 0 0 auto' : '0 auto')

function getTimeLeft() {
  const diff = new Date(props.targetDate || '').getTime() - Date.now()
  if (isNaN(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

const time = ref(getTimeLeft())
const done = computed(() => !time.value.days && !time.value.hours && !time.value.minutes && !time.value.seconds)

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => { timer = setInterval(() => { time.value = getTimeLeft() }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

function pad(n: number) { return String(n).padStart(2, '0') }

function unitStyle() {
  if (cs.value === 'neon') return { backgroundColor:'#000', borderRadius:'10px', padding:`${px(18)}px ${px(24)}px`, minWidth:`${px(90)}px`, boxShadow:`0 0 20px ${accent.value}55, 0 0 40px ${accent.value}22`, border:`1px solid ${accent.value}66` }
  if (cs.value === 'minimal') return { padding:`${px(10)}px ${px(20)}px`, minWidth:`${px(80)}px` }
  return { backgroundColor:cardBg.value, borderRadius:'12px', padding:`${px(20)}px ${px(28)}px`, minWidth:`${px(90)}px`, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', border:`2px solid ${accent.value}22` }
}

function numColor() { return cs.value === 'neon' ? accent.value : text.value }
function numShadow() { return cs.value === 'neon' ? `0 0 12px ${accent.value}` : 'none' }

const units = computed(() => [
  { key: 'days' as const,    lbl: 'Days',    show: props.showDays    !== false },
  { key: 'hours' as const,   lbl: 'Hours',   show: props.showHours   !== false },
  { key: 'minutes' as const, lbl: 'Minutes', show: props.showMinutes !== false },
  { key: 'seconds' as const, lbl: 'Seconds', show: props.showSeconds !== false },
].filter(u => u.show))

// Abbreviated labels for the slim bar style — matches studio-app's
// CountdownTimer.tsx BAR_LABELS exactly, keep them in sync.
const barUnits = computed(() => [
  { key: 'days' as const,    lbl: 'Days',  show: props.showDays    !== false },
  { key: 'hours' as const,   lbl: 'Hours', show: props.showHours   !== false },
  { key: 'minutes' as const, lbl: 'Mins',  show: props.showMinutes !== false },
  { key: 'seconds' as const, lbl: 'Sec',   show: props.showSeconds !== false },
].filter(u => u.show))
</script>

<template>
  <!-- Slim, single-row announcement-bar layout — deliberately not built on
       unitStyle()/the stacked-card markup below (that's sized for 52px
       digits), so it stays narrow enough to sit inside a Columns dropzone
       instead of a full-width hero section. Mirrors studio-app's BarTimer. -->
  <component :is="primaryButtonUrl ? 'a' : 'div'" v-if="cs === 'bar'" :href="primaryButtonUrl || undefined" :style="{ textDecoration:'none', display:'block' }">
    <div :style="{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px', backgroundColor:bg, padding:'14px 24px' }">
      <span v-if="headline" :style="{ fontSize:'15px', fontWeight:600, color:heading }">{{ headline }}</span>
      <div :style="{ display:'flex', alignItems:'center', gap:'16px', color:text }">
        <span v-if="done && endMessage" :style="{ fontSize:'14px', fontWeight:700, color:accent }">{{ endMessage }}</span>
        <div v-else :style="{ display:'flex', alignItems:'center', gap:'8px', fontSize:'14px', fontWeight:600, fontVariantNumeric:'tabular-nums', flexWrap:'wrap' }">
          <span v-for="(u, i) in barUnits" :key="u.key" :style="{ display:'flex', alignItems:'center', gap:'8px' }">
            <span v-if="i > 0" :style="{ opacity:0.4 }">:</span>
            {{ pad(time[u.key]) }} {{ u.lbl }}
          </span>
        </div>
        <span v-if="primaryButtonUrl" :style="{ fontSize:'18px', lineHeight:1 }" aria-hidden="true">&rsaquo;</span>
      </div>
    </div>
  </component>

  <section
    v-else
    :style="{
      position: 'relative',
      backgroundColor: hasImage ? undefined : bg,
      backgroundImage: hasImage ? `url(${props.backgroundImage})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: props.embedded ? 0 : '72px 24px',
      textAlign: textPos,
      ...(gridMode ? { display: 'flex', flexDirection: 'column', flex: '1 1 auto' } : {}),
    }"
  >
    <div v-if="hasImage" :style="{ position:'absolute', inset:0, backgroundColor:`rgba(0,0,0,${overlay})` }" />
    <!-- Headline and digits on different sides: one row, three columns
         (left / centre / right) so each sits in its own column and the unused
         middle stays clear for a midground image. Stacks on narrow screens
         (.cd-row media query below), each keeping its alignment. Mirrors
         CountdownTimer.tsx: columns left/centre/right, rows top/centre/bottom. -->
    <div v-if="gridMode" class="cd-row" :style="{ position:'relative', zIndex:1, flex:'1 1 auto', display:'grid', gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)', gridTemplateRows:'auto 1fr auto', gap:'24px 32px' }">
      <div :style="{ gridColumn:H_COLUMN[textPos], gridRow:V_ROW[textV], justifySelf:H_SELF[textPos], alignSelf:V_SELF[textV], textAlign:textPos, maxWidth:'520px' }">
        <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color:heading, fontWeight:800, margin:'0 0 14px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color:heading, opacity:0.65, fontSize:'18px', margin:0, lineHeight:1.65 }">{{ subheadline }}</p>
        <div v-if="primaryButtonText" :style="{ marginTop:'24px' }">
          <a :href="primaryButtonUrl||'#'" :style="{ display:'inline-block', backgroundColor:accent, color:'#fff', padding:'14px 40px', borderRadius:'8px', textDecoration:'none', fontWeight:700, fontSize:'16px' }">{{ primaryButtonText }}</a>
        </div>
      </div>
      <div :style="{ gridColumn:H_COLUMN[digitsPos], gridRow:V_ROW[digitsV], justifySelf:H_SELF[digitsPos], alignSelf:V_SELF[digitsV], marginTop: `${props.digitsOffsetY || 0}px` }">
        <div v-if="done && endMessage" :style="{ padding:'32px 48px', backgroundColor:accent, borderRadius:'16px', display:'inline-block' }">
          <p :style="{ color:'#fff', fontSize:'26px', fontWeight:800, margin:0 }">{{ endMessage }}</p>
        </div>
        <div v-else :style="{ display:'flex', alignItems:'center', justifyContent:H_SELF[digitsPos], gap:`${px(12)}px`, flexWrap:'wrap' }">
          <template v-for="(u, i) in units" :key="u.key">
            <div :style="{ display:'flex', flexDirection:'column', alignItems:'center', gap:`${px(8)}px` }">
              <div :style="unitStyle()">
                <div :style="{ fontSize:`${px(52)}px`, fontWeight:800, lineHeight:1, color:numColor(), fontVariantNumeric:'tabular-nums', textShadow:numShadow(), letterSpacing:'-2px' }">
                  {{ pad(time[u.key]) }}
                </div>
              </div>
              <span :style="{ fontSize:`${px(12)}px`, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:label }">{{ u.lbl }}</span>
            </div>
            <div v-if="separators && i < units.length - 1" :style="{ display:'flex', flexDirection:'column', gap:`${px(12)}px`, paddingBottom:`${px(28)}px`, color:text, opacity:0.5, fontSize:`${px(32)}px`, fontWeight:800 }">:</div>
          </template>
        </div>
      </div>
    </div>

    <div v-else :style="{ position:'relative', zIndex:1, maxWidth:'800px', margin:stackMargin }">
      <!-- sb-text-fluid-md (assets/css/responsive.css) scales this down on
           narrow screens instead of staying fixed at 36px — the countdown
           digits/separator below stay fixed, they're short and narrow
           regardless of viewport width. -->
      <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color:heading, fontWeight:800, margin:'0 0 14px' }">{{ headline }}</h2>
      <p v-if="subheadline" :style="{ color:heading, opacity:0.65, fontSize:'18px', margin:'0 0 48px', lineHeight:1.65 }">{{ subheadline }}</p>

      <div :style="{ marginTop: `${props.digitsOffsetY || 0}px` }">
        <div v-if="done && endMessage" :style="{ padding:'32px 48px', backgroundColor:accent, borderRadius:'16px', display:'inline-block' }">
          <p :style="{ color:'#fff', fontSize:'26px', fontWeight:800, margin:0 }">{{ endMessage }}</p>
        </div>

        <div v-else :style="{ display:'flex', alignItems:'center', justifyContent:H_SELF[digitsPos], gap:`${px(12)}px`, flexWrap:'wrap' }">
          <template v-for="(u, i) in units" :key="u.key">
            <div :style="{ display:'flex', flexDirection:'column', alignItems:'center', gap:`${px(8)}px` }">
              <div :style="unitStyle()">
                <div :style="{ fontSize:`${px(52)}px`, fontWeight:800, lineHeight:1, color:numColor(), fontVariantNumeric:'tabular-nums', textShadow:numShadow(), letterSpacing:'-2px' }">
                  {{ pad(time[u.key]) }}
                </div>
              </div>
              <span :style="{ fontSize:`${px(12)}px`, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:label }">{{ u.lbl }}</span>
            </div>
            <div v-if="separators && i < units.length - 1" :style="{ display:'flex', flexDirection:'column', gap:`${px(12)}px`, paddingBottom:`${px(28)}px`, color:text, opacity:0.5, fontSize:`${px(32)}px`, fontWeight:800 }">:</div>
          </template>
        </div>
      </div>

      <div v-if="primaryButtonText" :style="{ marginTop:'48px' }">
        <a :href="primaryButtonUrl||'#'" :style="{ display:'inline-block', backgroundColor:accent, color:'#fff', padding:'14px 40px', borderRadius:'8px', textDecoration:'none', fontWeight:700, fontSize:'16px' }">{{ primaryButtonText }}</a>
      </div>
    </div>
  </section>
</template>

<style>
@media (max-width: 767px) {
  .cd-row { grid-template-columns: 1fr !important; grid-template-rows: auto !important; flex: none !important; }
  .cd-row > * { grid-column: 1 !important; grid-row: auto !important; }
}
</style>
