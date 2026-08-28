<script setup lang="ts">
// Site-wide notice bar rendered above SiteHeader by layouts/default.vue, sourced
// from the same sb_site_settings row (server/utils/stratum.ts's SiteSettings
// interface). Ported 1:1 from studio-app's components/Navigation/AnnouncementBar.tsx
// so both renderers behave identically — keep both in sync. 'static' renders the
// message once, centered; 'scroll' runs it as a continuous CSS-keyframe marquee.
// announcementSpeed is seconds per full loop (lower = faster).
//
// The message is repeated REPEAT_COUNT times per half-track (not just duplicated
// once) so the animated track is comfortably wider than the viewport regardless of
// message length -- a single short message centered and translated by only its own
// narrow width drifts just a few px over a full loop, which reads as static, not
// scrolling. Repeating fills the bar edge-to-edge and makes the translateX(-50%)
// sweep (still exactly one half-track width, so the loop stays seamless) span real
// distance. Fixed 2026-08-23 after Dana reported the scrolling mode looked static.
import type { SiteSettings } from '~/server/utils/stratum'

const REPEAT_COUNT = 6

const props = defineProps<{ settings: SiteSettings }>()

const visible = computed(() => Boolean(props.settings.announcementEnabled && props.settings.announcementMessage))
const bg = computed(() => props.settings.announcementBgColor || '#dc2626')
const text = computed(() => props.settings.announcementTextColor || '#ffffff')
const speed = computed(() => Math.max(props.settings.announcementSpeed || 20, 5))
const isScroll = computed(() => props.settings.announcementMode === 'scroll')
</script>

<template>
  <div
    v-if="visible"
    :style="{
      backgroundColor: bg, color: text, fontSize: '13px', fontWeight: 500,
      padding: isScroll ? '10px 0' : '10px 16px', textAlign: isScroll ? 'left' : 'center',
      overflow: 'hidden', whiteSpace: 'nowrap',
    }"
  >
    <div v-if="isScroll" style="display:inline-flex" :style="{ animation: `announcement-marquee ${speed}s linear infinite` }">
      <span style="display:inline-flex">
        <span v-for="n in REPEAT_COUNT" :key="`a-${n}`" style="display:inline-flex;align-items:center;padding-right:64px">
          <a v-if="settings.announcementLinkUrl" :href="settings.announcementLinkUrl" :style="{ color: text, textDecoration: 'none' }">
            {{ settings.announcementMessage }}<span aria-hidden="true" style="margin-left:8px">&rarr;</span>
          </a>
          <span v-else :style="{ color: text }">{{ settings.announcementMessage }}</span>
        </span>
      </span>
      <span aria-hidden="true" style="display:inline-flex">
        <span v-for="n in REPEAT_COUNT" :key="`b-${n}`" style="display:inline-flex;align-items:center;padding-right:64px">
          <a v-if="settings.announcementLinkUrl" :href="settings.announcementLinkUrl" :style="{ color: text, textDecoration: 'none' }">
            {{ settings.announcementMessage }}<span aria-hidden="true" style="margin-left:8px">&rarr;</span>
          </a>
          <span v-else :style="{ color: text }">{{ settings.announcementMessage }}</span>
        </span>
      </span>
    </div>
    <div v-else style="overflow:hidden;text-overflow:ellipsis">
      <a v-if="settings.announcementLinkUrl" :href="settings.announcementLinkUrl" :style="{ color: text, textDecoration: 'none' }">
        {{ settings.announcementMessage }}<span aria-hidden="true" style="margin-left:8px">&rarr;</span>
      </a>
      <span v-else :style="{ color: text }">{{ settings.announcementMessage }}</span>
    </div>
  </div>
</template>

<style>
/* Deliberately unscoped, unlike every other <style> block in this component.
   The animation-name is applied via an inline :style binding (a plain JS string
   built at runtime), which the SFC compiler can't see -- if this block were
   `scoped`, Vue renames @keyframes to `announcement-marquee-data-v-xxxx` at
   build time but has no way to rewrite the inline style's string to match,
   so the two names silently diverge and the browser finds no matching
   keyframes for animation-name: announcement-marquee (no error, just no
   animation). Found live 2026-08-23: worked in studio-app's React preview
   (no such scoping mechanism) but was static on the actual published site.
   @keyframes has no scoping mechanism in CSS itself anyway, so leaving this
   unscoped costs nothing. */
@keyframes announcement-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
</style>
