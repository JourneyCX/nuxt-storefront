<script setup lang="ts">
import { fetchSiteSettings, fetchThemeCss, type SiteSettings, type ThemeCss } from '~/server/utils/stratum'
// Explicit import, not Nuxt's directory-based auto-import (which would prefix the
// tag as <StorefrontSiteHeader> since these live under components/storefront/) —
// same convention StorefrontRenderer.vue already uses for the same reason.
import SiteHeader from '~/components/storefront/SiteHeader.vue'
import SiteFooter from '~/components/storefront/SiteFooter.vue'
import WhatsAppWidget from '~/components/storefront/WhatsAppWidget.vue'
import AnnouncementBar from '~/components/storefront/AnnouncementBar.vue'

// tenantId is resolved once by server/middleware/tenant.ts for every request and
// stashed on event.context.tenantId. [...slug].vue reads the same shared useState
// key — both this layout and the page pick up the identical value without a second
// domain-resolution round trip.
const tenantId = useState<number>('sb_tenantId', () => {
  const ev = useRequestEvent()
  return (ev?.context?.tenantId as number) ?? 0
})

const config = useRuntimeConfig()

// Runs in parallel with [...slug].vue's own page-JSON fetch during SSR — neither
// depends on the other's result, both cached under the same ISR route-rule
// boundary, so this adds no serial latency on a cache hit or miss.
const { data: settings } = await useAsyncData<SiteSettings | null>(
  `settings-${tenantId.value}`,
  () => tenantId.value ? fetchSiteSettings(config.stratumInternalUrl, tenantId.value) : Promise.resolve(null),
  { server: true }
)

// Graceful defaults — a brand-new tenant mid-provisioning (no sb_site_settings row
// yet) or a transient fetch failure must still render a usable page, not a hard
// error. Same `value || default` convention used throughout every component here.
const s = computed<SiteSettings>(() => ({
  logoUrl: null, logoAlt: null, logoText: null, faviconUrl: null,
  businessName: 'Your Store', tagline: null, description: null,
  contactPhone: null, contactEmail: null, contactAddress: null,
  socialLinks: [], navLinks: [],
  headerBackgroundColor: '#ffffff', headerTextColor: '#1a202c', headerAccentColor: '#1a202c',
  headerSticky: true, headerCtaText: null, headerCtaUrl: null,
  footerBackgroundColor: '#1a202c', footerTextColor: '#a0aec0', footerAccentColor: '#ffffff',
  footerCopyrightText: null, footerColumns: [], footerShowBrandColumn: true,
  whatsappEnabled: false, whatsappPopupEnabled: true, whatsappPhone: null,
  whatsappMessageTitle: null, whatsappMessageBody: null, whatsappButtonColor: null,
  announcementEnabled: false, announcementMessage: null, announcementMode: 'static',
  announcementBgColor: '#dc2626', announcementTextColor: '#ffffff', announcementLinkUrl: null,
  announcementSpeed: 20,
  ...(settings.value ?? {}),
}))

// Store Theme Manager's style tokens (colors/fonts/border-radius/button
// style) for this tenant's currently applied theme — same parallel-fetch
// pattern as site settings above (only needs tenantId, no dependency on the
// page-JSON fetch). Was never wired up before now: Store_theme_tenant::css()
// existed but is an AdminController endpoint nuxt-storefront's unauthenticated
// server-side fetch could never reach — Store_builder_api::theme_css() is the
// reachable replacement. See assets/css/theme-tokens.css for the static base
// rules (font-family/color/background) that map these CSS custom properties
// onto actual page styling — this fetch only supplies the per-theme VALUES.
const { data: themeCss } = await useAsyncData<ThemeCss | null>(
  `theme-css-${tenantId.value}`,
  () => tenantId.value ? fetchThemeCss(config.stratumInternalUrl, { tenantId: tenantId.value }) : Promise.resolve(null),
  { server: true }
)

// faviconUrl is fetched into `s` above but was never wired to the actual <head>
// tag anywhere in the app — nuxt.config.ts's static <link> list has no icon
// entry either, so every tenant's uploaded favicon silently had no effect on
// the browser tab. useHead here is reactive on s.value.faviconUrl, so SSR HTML
// carries the right tenant's icon straight away.
useHead(() => ({
  link: [
    ...(s.value.faviconUrl ? [{ rel: 'icon', href: s.value.faviconUrl }] : []),
    ...(themeCss.value?.google_fonts_url ? [{ rel: 'stylesheet', href: themeCss.value.google_fonts_url }] : []),
  ],
  style: themeCss.value?.css ? [{ innerHTML: themeCss.value.css, key: 'sb-theme-tokens' }] : [],
}))
</script>

<template>
  <AnnouncementBar :settings="s" />
  <SiteHeader :settings="s" />
  <slot />
  <SiteFooter :settings="s" />
  <WhatsAppWidget :settings="s" />
</template>

<style>
/* Every storefront component hardcodes its own px font-size independently (no
   shared base/theme variable exists anywhere in this app) — scaling the whole
   rendered page via zoom raises readability everywhere in one place instead of
   hand-editing ~370 individual declarations across ~40 files. Unscoped
   deliberately: targets the real <html>/<body>, which a Vue `scoped` style
   cannot reach since they're outside the app's own render tree in Nuxt SSR.
   Targets <body>, not <html>: zoom on the root <html> element interacts
   unreliably with this app's `width=device-width, initial-scale=1` viewport
   meta tag (nuxt.config.ts) in some browsers — confirmed live 2026-08-03,
   Studio's editor preview (a separate SPA/iframe with no such viewport meta)
   visibly scaled correctly while the real site with the same html-level rule
   did not. <body> zoom doesn't have this interaction.

   Interacts with the responsive breakpoints in assets/css/responsive.css —
   this scales rendered content 25% larger than those media query widths
   assume, so a layout that just fits un-zoomed can overflow once zoomed.
   Flagged for deliberate handling during the Phase 4 widget sweep rather
   than left to fight the new rules silently. */
body {
  zoom: 1.25;
}
</style>
