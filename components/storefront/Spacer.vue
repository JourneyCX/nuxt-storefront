<script setup lang="ts">
defineProps<{ height?: number }>()
</script>
<template>
  <div :style="{ height:`${height||40}px`, display:'block' }" />
</template>
