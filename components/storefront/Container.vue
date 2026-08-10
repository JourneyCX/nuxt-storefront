<script setup lang="ts">
defineProps<{ paddingY?: number; paddingX?: number; maxWidth?: number; backgroundColor?: string }>()
</script>
<template>
  <section :style="{ backgroundColor:backgroundColor||'#fff', padding:`${paddingY||40}px ${paddingX||24}px` }">
    <div :style="{ maxWidth:`${maxWidth||1200}px`, margin:'0 auto' }">
      <slot />
    </div>
  </section>
</template>
