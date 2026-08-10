<script setup lang="ts">
defineProps<{ src?: string; alt?: string; width?: string; borderRadius?: number; objectFit?: string }>()
</script>
<template>
  <img v-if="src" :src="src" :alt="alt||''" :style="{ width:width||'100%', borderRadius:`${borderRadius||0}px`, objectFit:(objectFit||'cover') as any, display:'block', maxWidth:'100%' }" />
</template>
