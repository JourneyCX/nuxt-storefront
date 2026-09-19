<script setup lang="ts">
// Site-wide notice bar rendered above SiteHeader by layouts/default.vue, sourced
// from the same sb_site_settings row (server/utils/stratum.ts's SiteSettings
// interface). Ported 1:1 from studio-app's components/Navigation/AnnouncementBar.tsx
// so both renderers behave identically — keep both in sync. 'static' renders the
// message once, centered; 'scroll' runs it as a continuous CSS-keyframe marquee.
// announcementSpeed is seconds per full loop (lower = faster). An optional
// "sale ends in" countdown (announcementShowCountdown/announcementCountdownEnd)
// renders alongside the message — fixed to the right of the scrolling track in
// scroll mode, or grouped with the message in static mode.
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
const countdownTarget = computed(() => (
  props.settings.announcementShowCountdown && props.settings.announcementCountdownEnd
    ? props.settings.announcementCountdownEnd
    : null
))

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number }

// announcement_countdown_end round-trips through a MySQL DATETIME column, which comes
// back as a naive "YYYY-MM-DD HH:mm:ss" string (no timezone) -- new Date() parses that
// space-separated form as LOCAL time in whichever runtime evaluates it (the SSR Node
// process here, not necessarily UTC), silently shifting the countdown by the server's
// local UTC offset. The value is always UTC by convention (studio-app's picker converts
// via toISOString() before saving), so force it to be read as UTC unless it already
// carries an explicit offset.
function toUtcIso(target: string): string {
  return /Z$|[+-]\d{2}:?\d{2}$/.test(target) ? target : `${target.replace(' ', 'T')}Z`
}

function getTimeLeft(target: string): TimeLeft {
  const diff = new Date(toUtcIso(target)).getTime() - Date.now()
  if (isNaN(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

function pad(n: number) { return String(n).padStart(2, '0') }

const time = ref<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
const countdownDone = computed(() => time.value.days === 0 && time.value.hours === 0 && time.value.minutes === 0 && time.value.seconds === 0)
const showCountdown = computed(() => Boolean(countdownTarget.value) && !countdownDone.value)

let intervalId: ReturnType<typeof setInterval> | undefined

function tick() {
  if (countdownTarget.value) time.value = getTimeLeft(countdownTarget.value)
}

watch(countdownTarget, (target) => {
  if (intervalId) clearInterval(intervalId)
  if (!target) return
  tick()
  intervalId = setInterval(tick, 1000)
}, { immediate: true })

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <div
    v-if="visible"
    :style="{
      backgroundColor: bg, color: text, fontSize: '13px', fontWeight: 500,
      padding: isScroll && !showCountdown ? '10px 0' : '10px 16px',
      overflow: 'hidden',
    }"
  >
    <div
      style="display:flex;align-items:center;gap:16px"
      :style="{ justifyContent: isScroll ? 'flex-start' : 'center', flexWrap: isScroll ? 'nowrap' : 'wrap' }"
    >
      <div v-if="isScroll" style="flex:1;min-width:0;overflow:hidden;white-space:nowrap">
        <div style="display:inline-flex" :style="{ animation: `announcement-marquee ${speed}s linear infinite` }">
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
      </div>
      <div v-else style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        <a v-if="settings.announcementLinkUrl" :href="settings.announcementLinkUrl" :style="{ color: text, textDecoration: 'none' }">
          {{ settings.announcementMessage }}<span aria-hidden="true" style="margin-left:8px">&rarr;</span>
        </a>
        <span v-else :style="{ color: text }">{{ settings.announcementMessage }}</span>
      </div>

      <div
        v-if="showCountdown"
        style="display:flex;align-items:center;gap:6px;flex-shrink:0;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap"
        :style="{ color: text }"
      >
        <span>{{ pad(time.days) }} Days</span>
        <span aria-hidden="true" style="opacity:0.5">:</span>
        <span>{{ pad(time.hours) }} Hours</span>
        <span aria-hidden="true" style="opacity:0.5">:</span>
        <span>{{ pad(time.minutes) }} Mins</span>
        <span aria-hidden="true" style="opacity:0.5">:</span>
        <span>{{ pad(time.seconds) }} Sec</span>
      </div>
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
