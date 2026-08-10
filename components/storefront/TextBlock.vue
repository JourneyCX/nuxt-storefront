<script setup lang="ts">
defineProps<{ text?: string; fontSize?: number; fontWeight?: string; textAlign?: string; color?: string }>()
</script>
<template>
  <p :style="{ margin:0, fontSize:`${fontSize||16}px`, fontWeight:fontWeight||'normal', textAlign:(textAlign||'left') as any, color:color||'#1a202c', lineHeight:1.7, whiteSpace:'pre-wrap' }">
    {{ text }}
  </p>
</template>
