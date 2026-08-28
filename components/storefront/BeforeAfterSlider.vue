<script setup lang="ts">
const props = defineProps<{
  beforeImage?: string
  afterImage?: string
  beforeLabel?: string
  afterLabel?: string
  initialPosition?: number
  sliderColor?: string
  labelColor?: string
  labelBg?: string
  borderRadius?: number
  minHeight?: number
  headline?: string
  subheadline?: string
  backgroundColor?: string
  textColor?: string
}>()

const position = ref(props.initialPosition ?? 50)
const containerRef = ref<HTMLDivElement | null>(null)
const dragging = ref(false)

function calc(clientX: number) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  position.value = Math.min(98, Math.max(2, ((clientX - rect.left) / rect.width) * 100))
}

function onMouseDown(e: MouseEvent) {
  e.preventDefault()
  dragging.value = true
  const onMove = (ev: MouseEvent) => { if (dragging.value) calc(ev.clientX) }
  const onUp = () => {
    dragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onTouchMove(e: TouchEvent) { calc(e.touches[0].clientX) }
function onTouchStart(e: TouchEvent) { calc(e.touches[0].clientX) }

const slider = computed(() => props.sliderColor || '#ffffff')
const text = computed(() => props.textColor || '#1e293b')
const bg = computed(() => props.backgroundColor || '#f8fafc')
const radius = computed(() => props.borderRadius ?? 14)
const minH = computed(() => props.minHeight ?? 440)
</script>

<template>
  <section :style="{ backgroundColor: bg, padding: '64px 24px' }">
    <div :style="{ maxWidth: '900px', margin: '0 auto' }">
      <div v-if="headline || subheadline" :style="{ textAlign:'center', marginBottom:'40px' }">
        <!-- sb-text-fluid-md (assets/css/responsive.css) scales this down on
             narrow screens instead of staying fixed at 32px. -->
        <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color:text, fontWeight:800, margin:'0 0 12px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color:text, opacity:0.65, fontSize:'17px', margin:0, lineHeight:1.6 }">{{ subheadline }}</p>
      </div>

      <div
        ref="containerRef"
        @mousedown="onMouseDown"
        @touchmove.prevent="onTouchMove"
        @touchstart="onTouchStart"
        :style="{ position:'relative', borderRadius:`${radius}px`, overflow:'hidden', minHeight:`${minH}px`, userSelect:'none', cursor:'ew-resize', touchAction:'none', boxShadow:'0 8px 40px rgba(0,0,0,0.15)' }"
      >
        <!-- Before (full) -->
        <div :style="{ position:'absolute', inset:0 }">
          <img v-if="beforeImage" :src="beforeImage" :alt="beforeLabel||'Before'" :style="{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none' }" />
          <div v-else :style="{ width:'100%', height:'100%', background:'linear-gradient(135deg,#93c5fd,#60a5fa)', display:'flex', alignItems:'center', justifyContent:'center', color:'#1e40af', fontSize:'18px', fontWeight:700 }">Before</div>
        </div>

        <!-- After (clipped) -->
        <div :style="{ position:'absolute', inset:0, clipPath:`inset(0 ${100 - position}% 0 0)` }">
          <img v-if="afterImage" :src="afterImage" :alt="afterLabel||'After'" :style="{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none' }" />
          <div v-else :style="{ width:'100%', height:'100%', background:'linear-gradient(135deg,#6ee7b7,#34d399)', display:'flex', alignItems:'center', justifyContent:'center', color:'#065f46', fontSize:'18px', fontWeight:700 }">After</div>
        </div>

        <!-- Divider line + handle -->
        <div :style="{ position:'absolute', top:0, bottom:0, left:`${position}%`, transform:'translateX(-50%)', width:'3px', backgroundColor:slider, zIndex:3, pointerEvents:'none' }">
          <div :style="{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'44px', height:'44px', borderRadius:'50%', backgroundColor:slider, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.3)', cursor:'ew-resize' }">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="12" x2="2" y2="12" /><polyline points="5 9 2 12 5 15" />
              <line x1="16" y1="12" x2="22" y2="12" /><polyline points="19 9 22 12 19 15" />
            </svg>
          </div>
        </div>

        <!-- Labels -->
        <div v-if="beforeLabel" :style="{ position:'absolute', top:'16px', left:'16px', backgroundColor:labelBg||'rgba(0,0,0,0.5)', color:labelColor||'#ffffff', fontSize:'13px', fontWeight:700, padding:'5px 12px', borderRadius:'20px', letterSpacing:'0.04em', pointerEvents:'none', zIndex:2 }">{{ beforeLabel }}</div>
        <div v-if="afterLabel" :style="{ position:'absolute', top:'16px', right:'16px', backgroundColor:labelBg||'rgba(0,0,0,0.5)', color:labelColor||'#ffffff', fontSize:'13px', fontWeight:700, padding:'5px 12px', borderRadius:'20px', letterSpacing:'0.04em', pointerEvents:'none', zIndex:2 }">{{ afterLabel }}</div>
      </div>

      <p :style="{ textAlign:'center', color:text, opacity:0.4, fontSize:'13px', marginTop:'14px' }">← Drag to compare →</p>
    </div>
  </section>
</template>
