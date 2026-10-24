<script setup lang="ts">
import { safeFontFamily } from '~/utils/fontFamilies'
defineProps<{ text?: string; fontSize?: number; fontWeight?: string; textAlign?: string; color?: string; fontFamily?: string }>()
</script>
<template>
  <p :style="{ margin:0, fontSize:`${fontSize||16}px`, fontWeight:fontWeight||'normal', textAlign:(textAlign||'left') as any, color:color||'#1a202c', lineHeight:1.7, whiteSpace:'pre-wrap', ...(safeFontFamily(fontFamily) ? { fontFamily: safeFontFamily(fontFamily) } : {}) }">
    {{ text }}
  </p>
</template>
