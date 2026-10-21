<script setup lang="ts">
// align: where a narrower-than-full-width image sits in its column. Absent (every image
// saved before this field existed) = left, where it always sat. Mirrors studio-app's ImageBlock.tsx.
// linkUrl / openInNewTab: optional link around the image (same rules as ButtonBlock).
const props = defineProps<{ src?: string; alt?: string; width?: string; borderRadius?: number; objectFit?: string; align?: 'left' | 'center' | 'right'; linkUrl?: string; openInNewTab?: boolean }>()
const margin = computed(() => props.align === 'center' ? '0 auto' : props.align === 'right' ? '0 0 0 auto' : '0 auto 0 0')
// Merchant-typed link: never let a script URL through.
const href = computed(() => {
  const u = (props.linkUrl || '').trim()
  return !u || /^(javascript|data|vbscript):/i.test(u) ? '' : u
})
</script>
<template>
  <a v-if="src && href" :href="href" :target="openInNewTab ? '_blank' : undefined" :rel="openInNewTab ? 'noopener noreferrer' : undefined" :style="{ display:'block', width:width||'100%', maxWidth:'100%', margin }">
    <img :src="src" :alt="alt||''" :style="{ width:'100%', borderRadius:`${borderRadius||0}px`, objectFit:(objectFit||'cover') as any, display:'block', maxWidth:'100%' }" />
  </a>
  <img v-else-if="src" :src="src" :alt="alt||''" :style="{ width:width||'100%', borderRadius:`${borderRadius||0}px`, objectFit:(objectFit||'cover') as any, display:'block', maxWidth:'100%', margin }" />
</template>
