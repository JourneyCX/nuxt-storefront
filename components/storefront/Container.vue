<script setup lang="ts">
defineProps<{ paddingY?: number; paddingX?: number; maxWidth?: number; backgroundColor?: string }>()
</script>
<template>
  <!-- sb-container (assets/css/responsive.css) caps horizontal padding at
       24px on mobile via --sb-container-px, so a large desktop paddingX
       doesn't eat most of a 375px screen's width. -->
  <section class="sb-container" :style="{ backgroundColor:backgroundColor||'#fff', padding:`${paddingY||40}px ${paddingX||24}px`, '--sb-container-px':`${paddingX||24}px` }">
    <div :style="{ maxWidth:`${maxWidth||1200}px`, margin:'0 auto' }">
      <slot />
    </div>
  </section>
</template>
