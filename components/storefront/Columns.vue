<script setup lang="ts">
// `distribution` (e.g. 'sidebar13' -> narrow/wide asymmetric columns) drives the
// actual layout in the Puck editor (studio-app/src/components/Layout/Columns.tsx) —
// `columns` is a legacy prop no longer written there. Must read `distribution` here
// too, or asymmetric splits (sidebar layouts) silently render as equal-width columns.
const props = defineProps<{ distribution?: string; columns?: number; gap?: number; backgroundColor?: string }>()
const colTemplate = computed(() => (COLUMN_DISTRIBUTIONS[props.distribution ?? 'equal2'] ?? COLUMN_DISTRIBUTIONS.equal2).template)
</script>
<template>
  <div :style="{ backgroundColor:backgroundColor||'transparent', display:'grid', gridTemplateColumns:colTemplate, gap:`${gap||24}px` }">
    <slot />
  </div>
</template>
