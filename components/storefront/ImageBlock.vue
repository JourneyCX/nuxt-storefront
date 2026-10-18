<script setup lang="ts">
// align: where a narrower-than-full-width image sits in its column. Absent (every image
// saved before this field existed) = left, where it always sat. Mirrors studio-app's ImageBlock.tsx.
const props = defineProps<{ src?: string; alt?: string; width?: string; borderRadius?: number; objectFit?: string; align?: 'left' | 'center' | 'right' }>()
const margin = computed(() => props.align === 'center' ? '0 auto' : props.align === 'right' ? '0 0 0 auto' : '0 auto 0 0')
</script>
<template>
  <img v-if="src" :src="src" :alt="alt||''" :style="{ width:width||'100%', borderRadius:`${borderRadius||0}px`, objectFit:(objectFit||'cover') as any, display:'block', maxWidth:'100%', margin }" />
</template>
