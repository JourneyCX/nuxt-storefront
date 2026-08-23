<script setup lang="ts">
import { fetchSiteSettings, type SiteSettings } from '~/server/utils/stratum'
// Explicit import, not Nuxt's directory-based auto-import (which would prefix the
// tag as <StorefrontSiteHeader> since these live under components/storefront/) —
// same convention StorefrontRenderer.vue already uses for the same reason.
import SiteHeader from '~/components/storefront/SiteHeader.vue'
import SiteFooter from '~/components/storefront/SiteFooter.vue'
import WhatsAppWidget from '~/components/storefront/WhatsAppWidget.vue'

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
  ...(settings.value ?? {}),
}))

// faviconUrl is fetched into `s` above but was never wired to the actual <head>
// tag anywhere in the app — nuxt.config.ts's static <link> list has no icon
// entry either, so every tenant's uploaded favicon silently had no effect on
// the browser tab. useHead here is reactive on s.value.faviconUrl, so SSR HTML
// carries the right tenant's icon straight away.
useHead(() => ({
  link: s.value.faviconUrl ? [{ rel: 'icon', href: s.value.faviconUrl }] : [],
}))
</script>

<template>
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
   did not. <body> zoom doesn't have this interaction. */
body {
  zoom: 1.25;
}
</style>
