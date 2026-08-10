<script setup lang="ts">
defineProps<{ color?: string; thickness?: number; marginY?: number }>()
</script>
<template>
  <hr :style="{ border:'none', borderTop:`${thickness||1}px solid ${color||'#e2e8f0'}`, margin:`${marginY||16}px 0` }" />
</template>
