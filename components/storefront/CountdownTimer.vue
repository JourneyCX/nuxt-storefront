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
  cardStyle?: 'card' | 'minimal' | 'neon'
  accentColor?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  labelColor?: string
  primaryButtonText?: string
  primaryButtonUrl?: string
}>()

const accent = computed(() => props.accentColor || '#2563eb')
const bg = computed(() => props.backgroundColor || '#f8fafc')
const cardBg = computed(() => props.cardColor || '#ffffff')
const text = computed(() => props.textColor || '#1e293b')
const label = computed(() => props.labelColor || '#64748b')
const cs = computed(() => props.cardStyle || 'card')

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
  if (cs.value === 'neon') return { backgroundColor:'#000', borderRadius:'10px', padding:'18px 24px', minWidth:'90px', boxShadow:`0 0 20px ${accent.value}55, 0 0 40px ${accent.value}22`, border:`1px solid ${accent.value}66` }
  if (cs.value === 'minimal') return { padding:'10px 20px', minWidth:'80px' }
  return { backgroundColor:cardBg.value, borderRadius:'12px', padding:'20px 28px', minWidth:'90px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', border:`2px solid ${accent.value}22` }
}

function numColor() { return cs.value === 'neon' ? accent.value : text.value }
function numShadow() { return cs.value === 'neon' ? `0 0 12px ${accent.value}` : 'none' }

const units = computed(() => [
  { key: 'days' as const,    lbl: 'Days',    show: props.showDays    !== false },
  { key: 'hours' as const,   lbl: 'Hours',   show: props.showHours   !== false },
  { key: 'minutes' as const, lbl: 'Minutes', show: props.showMinutes !== false },
  { key: 'seconds' as const, lbl: 'Seconds', show: props.showSeconds !== false },
].filter(u => u.show))
</script>

<template>
  <section :style="{ backgroundColor:bg, padding:'72px 24px', textAlign:'center' }">
    <div :style="{ maxWidth:'800px', margin:'0 auto' }">
      <h2 v-if="headline" :style="{ color:text, fontSize:'36px', fontWeight:800, margin:'0 0 14px' }">{{ headline }}</h2>
      <p v-if="subheadline" :style="{ color:text, opacity:0.65, fontSize:'18px', margin:'0 0 48px', lineHeight:1.65 }">{{ subheadline }}</p>

      <div v-if="done && endMessage" :style="{ padding:'32px 48px', backgroundColor:accent, borderRadius:'16px', display:'inline-block' }">
        <p :style="{ color:'#fff', fontSize:'26px', fontWeight:800, margin:0 }">{{ endMessage }}</p>
      </div>

      <div v-else :style="{ display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', flexWrap:'wrap' }">
        <template v-for="(u, i) in units" :key="u.key">
          <div :style="{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }">
            <div :style="unitStyle()">
              <div :style="{ fontSize:'52px', fontWeight:800, lineHeight:1, color:numColor(), fontVariantNumeric:'tabular-nums', textShadow:numShadow(), letterSpacing:'-2px' }">
                {{ pad(time[u.key]) }}
              </div>
            </div>
            <span :style="{ fontSize:'12px', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:label }">{{ u.lbl }}</span>
          </div>
          <div v-if="i < units.length - 1" :style="{ display:'flex', flexDirection:'column', gap:'12px', paddingBottom:'28px', color:text, opacity:0.5, fontSize:'32px', fontWeight:800 }">:</div>
        </template>
      </div>

      <div v-if="primaryButtonText" :style="{ marginTop:'48px' }">
        <a :href="primaryButtonUrl||'#'" :style="{ display:'inline-block', backgroundColor:accent, color:'#fff', padding:'14px 40px', borderRadius:'8px', textDecoration:'none', fontWeight:700, fontSize:'16px' }">{{ primaryButtonText }}</a>
      </div>
    </div>
  </section>
</template>
