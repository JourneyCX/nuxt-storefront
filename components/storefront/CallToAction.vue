<script setup lang="ts">
const props = defineProps<{
  headline?: string
  subheadline?: string
  primaryButtonText?: string
  primaryButtonUrl?: string
  primaryButtonColor?: string
  secondaryButtonText?: string
  secondaryButtonUrl?: string
  backgroundImage?: string
  backgroundColor?: string
  overlayOpacity?: number
  textColor?: string
  paddingY?: number
}>()

const hasImage = computed(() => !!props.backgroundImage)
const sectionStyle = computed(() => ({
  position: 'relative' as const,
  backgroundColor: hasImage.value ? undefined : (props.backgroundColor || '#2563eb'),
  backgroundImage: hasImage.value ? `url(${props.backgroundImage})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  padding: `${props.paddingY || 80}px 24px`,
  textAlign: 'center' as const,
}))
const primaryBtnColor = computed(() => props.primaryButtonColor || '#ffffff')
const primaryBtnTextColor = computed(() => {
  const c = primaryBtnColor.value.toLowerCase()
  return (c === '#ffffff' || c === '#fff') ? (props.backgroundColor || '#2563eb') : '#fff'
})
</script>

<template>
  <section :style="sectionStyle">
    <div v-if="hasImage" :style="{ position:'absolute', inset:0, backgroundColor:`rgba(0,0,0,${(overlayOpacity||55)/100})` }" />
    <div :style="{ position:'relative', zIndex:1, maxWidth:'680px', margin:'0 auto' }">
      <h2 :style="{ color: textColor||'#ffffff', fontSize:'40px', fontWeight:800, margin:'0 0 20px', lineHeight:1.15 }">{{ headline }}</h2>
      <p v-if="subheadline" :style="{ color: textColor||'#ffffff', opacity:0.85, fontSize:'18px', margin:'0 0 40px', lineHeight:1.65 }">{{ subheadline }}</p>
      <div :style="{ display:'flex', gap:'12px', flexWrap:'wrap', justifyContent:'center' }">
        <a v-if="primaryButtonText" :href="primaryButtonUrl||'#'" :style="{ display:'inline-block', backgroundColor:primaryBtnColor, color:primaryBtnTextColor, padding:'15px 36px', borderRadius:'8px', textDecoration:'none', fontWeight:700, fontSize:'16px' }">
          {{ primaryButtonText }}
        </a>
        <a v-if="secondaryButtonText" :href="secondaryButtonUrl||'#'" :style="{ display:'inline-block', backgroundColor:'transparent', color:textColor||'#ffffff', padding:'15px 36px', borderRadius:'8px', textDecoration:'none', fontWeight:700, fontSize:'16px', border:`2px solid ${(textColor||'#ffffff')}66` }">
          {{ secondaryButtonText }}
        </a>
      </div>
    </div>
  </section>
</template>
