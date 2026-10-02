<script setup lang="ts">
// `distribution` (e.g. 'sidebar13' -> narrow/wide asymmetric columns) drives the
// actual layout in the Puck editor (studio-app/src/components/Layout/Columns.tsx) —
// `columns` is a legacy prop no longer written there. Must read `distribution` here
// too, or asymmetric splits (sidebar layouts) silently render as equal-width columns.
const props = defineProps<{ distribution?: string; columns?: number; gap?: number; backgroundColor?: string; verticalAlign?: 'stretch' | 'top' | 'center' | 'bottom' }>()
const colTemplate = computed(() => (COLUMN_DISTRIBUTIONS[props.distribution ?? 'equal2'] ?? COLUMN_DISTRIBUTIONS.equal2).template)
const VERTICAL_ALIGN_CSS: Record<string, string> = { stretch: 'stretch', top: 'start', center: 'center', bottom: 'end' }
const alignItemsCss = computed(() => VERTICAL_ALIGN_CSS[props.verticalAlign ?? 'stretch'] ?? 'stretch')
// sb-grid-sidebar (assets/css/responsive.css) stacks a sidebar13/sidebar31 split
// a full tier earlier than the plain .sb-grid distributions below — a narrow
// filter/nav column next to a wide content column (e.g. ProductFilter beside
// ProductGrid) has no room at tablet width either, and forcing both this
// grid AND the content column's own inner grid to "2 equal columns" at the
// same breakpoint compounds into a cramped strip either side.
const isSidebar = computed(() => props.distribution === 'sidebar13' || props.distribution === 'sidebar31')
</script>
<template>
  <!-- sb-grid (assets/css/responsive.css) collapses this to 1 column on
       mobile and 2 on tablet regardless of the merchant's chosen
       distribution — a 4-column split has no business staying that shape
       on a 375px screen. Desktop keeps whatever colTemplate picks.
       Sidebar distributions use sb-grid-sidebar instead (stacks below
       1024px) — see the comment on isSidebar above. -->
  <div :class="isSidebar ? 'sb-grid-sidebar' : 'sb-grid'" :style="{ backgroundColor:backgroundColor||'transparent', display:'grid', gridTemplateColumns:colTemplate, gap:`${gap||24}px`, alignItems:alignItemsCss }">
    <slot />
  </div>
</template>
