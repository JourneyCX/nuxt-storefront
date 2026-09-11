<script setup lang="ts">
// Sticky banner shown on every page of a theme "View Demo" session — the
// dedicated /preview/[themeId] route, and /product/[slug] + /blog/[slug]
// when visited with ?previewTheme=X (their own dynamic-data-driven page
// types, see those files' own comments for why they can't render through
// the generic preview route directly). Kept as a single shared component so
// a merchant clicking through Home -> Product -> Collection sees the same
// nav/context the whole way, not a banner that changes shape per page type.
import type { PreviewSlot } from '~/server/utils/stratum'

const props = withDefaults(defineProps<{
  themeId: number
  themeName: string
  slots: PreviewSlot[]
  currentPageType: string
  // Real product/blog-post slugs on this demo storefront to link the
  // Product/Blog Post nav entries at — those two slot types have no
  // meaning outside a real item's URL (see the routing note above), unlike
  // every other slot type which the dedicated preview route renders directly.
  demoProductSlug?: string | null
  demoBlogSlug?: string | null
  // /product/[slug] and /blog/[slug]'s ?previewTheme= override only works
  // once the theme-driven product/blog refactor those two pages depend on is
  // itself deployed (as of 2026-09-11 it's committed but not live — see this
  // component's own module comment). Defaults to false so a stale deploy
  // never silently links to a page that ignores the override and just shows
  // the real, non-previewed product/post — flip to true once that refactor
  // is confirmed live.
  productBlogPreviewLive?: boolean
}>(), {
  demoProductSlug: null,
  demoBlogSlug: null,
  productBlogPreviewLive: false,
})

function linkFor(slot: PreviewSlot) {
  if (slot.pageType === 'product' && props.demoProductSlug) {
    return { path: `/product/${props.demoProductSlug}`, query: { previewTheme: props.themeId } }
  }
  if (slot.pageType === 'blog_post' && props.demoBlogSlug) {
    return { path: `/blog/${props.demoBlogSlug}`, query: { previewTheme: props.themeId } }
  }
  return { path: `/preview/${props.themeId}`, query: { page: slot.pageType } }
}

// A slot is genuinely clickable only when it has a template assigned AND
// (for product/blog_post specifically) the preview override is actually live
// AND a real demo item exists to show it against -- otherwise the link would
// land on a "nothing assigned"/404/silently-wrong-content dead end with no
// way to explain why.
function isDisabled(slot: PreviewSlot): boolean {
  if (!slot.available) return true
  if (slot.pageType === 'product') return !props.productBlogPreviewLive || !props.demoProductSlug
  if (slot.pageType === 'blog_post') return !props.productBlogPreviewLive || !props.demoBlogSlug
  return false
}

function disabledReason(slot: PreviewSlot): string | undefined {
  if (!isDisabled(slot)) return undefined
  if (!slot.available) return 'No page assigned for this slot yet'
  return 'Preview isn\'t available for this page type yet'
}
</script>

<template>
  <div class="sb-preview-bar">
    <div class="sb-preview-bar__title">
      <span class="sb-preview-bar__badge">Theme Preview</span>
      <strong>{{ themeName }}</strong>
    </div>
    <nav class="sb-preview-bar__nav">
      <NuxtLink
        v-for="slot in slots"
        :key="slot.pageType"
        :to="linkFor(slot)"
        class="sb-preview-bar__link"
        :class="{
          'sb-preview-bar__link--active': slot.pageType === currentPageType,
          'sb-preview-bar__link--disabled': isDisabled(slot),
        }"
        :title="disabledReason(slot)"
      >
        {{ slot.label }}
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.sb-preview-bar {
  position: sticky;
  top: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 20px;
  background: #111827;
  color: #f9fafb;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sb-preview-bar__title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sb-preview-bar__badge {
  background: #4f46e5;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
}
.sb-preview-bar__nav {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.sb-preview-bar__link {
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
  text-decoration: none;
  font-size: 12px;
  white-space: nowrap;
}
.sb-preview-bar__link--active {
  background: #4f46e5;
  color: #fff;
}
.sb-preview-bar__link--disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}
</style>
