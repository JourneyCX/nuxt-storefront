<script setup lang="ts">
const props = defineProps<{
  icon?: string
  iconImage?: string
  iconSize?: number
  iconColor?: string
  title?: string
  titleFontSize?: number
  titleColor?: string
  description?: string
  descriptionFontSize?: number
  descriptionColor?: string
  align?: 'left' | 'center' | 'right'
  gap?: number
  minHeight?: number
}>()

const alignItems = computed(() => props.align === 'right' ? 'flex-end' : props.align === 'left' ? 'flex-start' : 'center')
</script>
<template>
  <div :style="{ display:'flex', flexDirection:'column', alignItems, justifyContent:'center', textAlign:(align||'center') as any, gap:`${gap ?? 10}px`, minHeight: minHeight ? `${minHeight}px` : undefined, boxSizing:'border-box' }">
    <img v-if="iconImage" :src="iconImage" alt="" :style="{ width:`${iconSize||40}px`, height:`${iconSize||40}px`, objectFit:'contain' }" />
    <div v-else-if="icon" :style="{ fontSize:`${iconSize||40}px`, lineHeight:1, color: iconColor||'#1a202c' }">{{ icon }}</div>
    <h3 v-if="title" :style="{ margin:0, fontSize:`${titleFontSize||18}px`, fontWeight:600, color: titleColor||'#1a202c' }">{{ title }}</h3>
    <p v-if="description" :style="{ margin:0, fontSize:`${descriptionFontSize||14}px`, color: descriptionColor||'#4a5568', lineHeight:1.6 }">{{ description }}</p>
  </div>
</template>
