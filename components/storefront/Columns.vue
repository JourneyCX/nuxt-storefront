<script setup lang="ts">
// `distribution` (e.g. 'sidebar13' -> narrow/wide asymmetric columns) drives the
// actual layout in the Puck editor (studio-app/src/components/Layout/Columns.tsx) —
// `columns` is a legacy prop no longer written there. Must read `distribution` here
// too, or asymmetric splits (sidebar layouts) silently render as equal-width columns.
const props = defineProps<{ distribution?: string; columns?: number; gap?: number; backgroundColor?: string }>()
const colTemplate = computed(() => (COLUMN_DISTRIBUTIONS[props.distribution ?? 'equal2'] ?? COLUMN_DISTRIBUTIONS.equal2).template)
</script>
<template>
  <!-- sb-grid (assets/css/responsive.css) collapses this to 1 column on
       mobile and 2 on tablet regardless of the merchant's chosen
       distribution — a 4-column or 1:3 sidebar split has no business
       staying that shape on a 375px screen. Desktop keeps whatever
       colTemplate picks. -->
  <div class="sb-grid" :style="{ backgroundColor:backgroundColor||'transparent', display:'grid', gridTemplateColumns:colTemplate, gap:`${gap||24}px` }">
    <slot />
  </div>
</template>
