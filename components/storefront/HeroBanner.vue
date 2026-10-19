<script setup lang="ts">
defineProps<{
  headline?: string; subheadline?: string; buttonText?: string; buttonUrl?: string
  buttonColor?: string; buttonTextColor?: string; buttonBorderColor?: string; buttonBorderWidth?: number
  backgroundImage?: string; overlayOpacity?: number
  textAlign?: string; minHeight?: number; borderRadius?: number
  headlineFontSize?: number; subheadlineFontSize?: number
  headlineColor?: string; subheadlineColor?: string; fontFamily?: string
}>()
</script>
<template>
  <div :style="{
    position:'relative', minHeight:`${minHeight||480}px`,
    display:'flex', alignItems:'center',
    justifyContent: textAlign==='center'?'center':textAlign==='right'?'flex-end':'flex-start',
    backgroundImage: backgroundImage?`url(${backgroundImage})`:undefined,
    backgroundColor: backgroundImage?undefined:'#2d3748',
    backgroundSize:'cover', backgroundPosition:'center',
    padding:'40px 24px', textAlign:(textAlign||'center') as any,
    borderRadius:`${borderRadius||0}px`, overflow:'hidden'
  }">
    <div v-if="backgroundImage" :style="{ position:'absolute',inset:0,backgroundColor:`rgba(0,0,0,${(overlayOpacity||40)/100})` }" />
    <div style="position:relative;z-index:1;max-width:640px">
      <!-- sb-text-fluid-lg (assets/css/responsive.css) scales this down on
           narrow screens instead of staying fixed at 48px. -->
      <h1 class="sb-text-fluid-lg" style="font-weight:800;margin:0 0 16px;line-height:1.15" :style="{ color: headlineColor || '#fff', ...(fontFamily ? { fontFamily } : {}), ...(headlineFontSize ? { fontSize: `${headlineFontSize}px` } : {}) }">{{ headline }}</h1>
      <p style="margin:0 0 32px;line-height:1.6" :style="{ color: subheadlineColor || 'rgba(255,255,255,0.85)', fontSize: `${subheadlineFontSize||18}px`, ...(fontFamily ? { fontFamily } : {}) }">{{ subheadline }}</p>
      <a v-if="buttonText" :href="buttonUrl||'#'"
         :style="{ display:'inline-block',backgroundColor:buttonColor||'#3182ce',color:buttonTextColor||'#fff',border:(buttonBorderWidth||0)>0&&buttonBorderColor?`${buttonBorderWidth}px solid ${buttonBorderColor}`:'none',padding:'14px 32px',borderRadius:'6px',textDecoration:'none',fontWeight:600,fontSize:'16px',...(fontFamily ? { fontFamily } : {}) }">
        {{ buttonText }}
      </a>
    </div>
  </div>
</template>
