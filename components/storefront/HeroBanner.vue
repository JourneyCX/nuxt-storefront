<script setup lang="ts">
defineProps<{
  headline?: string; subheadline?: string; buttonText?: string; buttonUrl?: string
  buttonColor?: string; backgroundImage?: string; overlayOpacity?: number
  textAlign?: string; minHeight?: number
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
    padding:'40px 24px', textAlign:(textAlign||'center') as any
  }">
    <div v-if="backgroundImage" :style="{ position:'absolute',inset:0,backgroundColor:`rgba(0,0,0,${(overlayOpacity||40)/100})` }" />
    <div style="position:relative;z-index:1;max-width:640px">
      <h1 style="color:#fff;font-size:48px;font-weight:800;margin:0 0 16px;line-height:1.15">{{ headline }}</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:18px;margin:0 0 32px;line-height:1.6">{{ subheadline }}</p>
      <a v-if="buttonText" :href="buttonUrl||'#'"
         :style="{ display:'inline-block',backgroundColor:buttonColor||'#3182ce',color:'#fff',padding:'14px 32px',borderRadius:'6px',textDecoration:'none',fontWeight:600,fontSize:'16px' }">
        {{ buttonText }}
      </a>
    </div>
  </div>
</template>
