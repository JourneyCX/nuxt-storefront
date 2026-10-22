<script setup lang="ts">
defineProps<{ text?: string; fontSize?: number; fontWeight?: string; textAlign?: string; color?: string; fontFamily?: string }>()
</script>
<template>
  <p :style="{ margin:0, fontSize:`${fontSize||16}px`, fontWeight:fontWeight||'normal', textAlign:(textAlign||'left') as any, color:color||'#1a202c', lineHeight:1.7, whiteSpace:'pre-wrap', ...(fontFamily ? { fontFamily } : {}) }">
    {{ text }}
  </p>
</template>
