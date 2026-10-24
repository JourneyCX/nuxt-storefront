<script setup lang="ts">
const props = defineProps<{
  headline?: string
  subheadline?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  accentColor?: string
  maxWidth?: number
  spaceAboveHeading?: number
  spaceHeadingToSub?: number
  spaceSubToQuestions?: number
  fontFamily?: string
  headingFontSize?: number
  subheadingFontSize?: number
  questionFontSize?: number
  items?: Array<{ question: string; answer: string }>
}>()

const openIndex = ref<number | null>(null)

const num = (v: number | undefined, d: number) => (typeof v === 'number' && !isNaN(v) ? v : d)

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor||'#ffffff', padding: '72px 24px', ...(fontFamily ? { fontFamily } : {}) }">
    <div :style="{ maxWidth:`${maxWidth||720}px`, margin:'0 auto' }">
      <div v-if="headline || subheadline" :style="{ textAlign:'center', marginTop:`${num(spaceAboveHeading,0)}px`, marginBottom:`${num(spaceSubToQuestions,48)}px` }">
        <h2 v-if="headline" :class="num(headingFontSize,0) > 0 ? undefined : 'sb-text-fluid-md'" :style="{ color:textColor||'#1e293b', fontWeight:800, margin:`0 0 ${subheadline ? num(spaceHeadingToSub,16) : 0}px`, ...(num(headingFontSize,0) > 0 ? { fontSize:`${headingFontSize}px` } : {}) }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color:textColor||'#1e293b', opacity:0.7, fontSize:`${num(subheadingFontSize,18)}px`, margin:0, lineHeight:1.65 }">{{ subheadline }}</p>
      </div>
      <div>
        <div
          v-for="(item, i) in (items||[])" :key="i"
          :style="{ backgroundColor:cardColor||'#f8fafc', borderRadius:'10px', overflow:'hidden', border:`1px solid ${textColor||'#1e293b'}14`, marginBottom:'8px' }"
        >
          <button
            @click="toggle(i)"
            :style="{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:'16px', fontFamily:'inherit' }"
          >
            <span :style="{ color:textColor||'#1e293b', fontSize:`${num(questionFontSize,17)}px`, fontWeight:600, lineHeight:1.4 }">{{ item.question }}</span>
            <span :style="{ color:accentColor||'#2563eb', fontSize:'22px', fontWeight:300, flexShrink:0, transform:openIndex===i?'rotate(45deg)':'none', transition:'transform 0.2s ease', display:'inline-block' }">+</span>
          </button>
          <div v-if="openIndex === i" :style="{ padding:'0 24px 20px' }">
            <p :style="{ color:textColor||'#1e293b', opacity:0.75, fontSize:'15px', lineHeight:1.7, margin:0 }">{{ item.answer }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
