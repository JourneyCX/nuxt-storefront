import type { SiteSettings } from '~/server/utils/stratum'

// Theme-preview counterpart to useSiteSettings() — same "fetch with graceful
// defaults" shape (defaults kept byte-identical to that composable's, so a
// theme with no chrome captured yet renders exactly like a brand-new tenant's
// real storefront would), but sourced from the THEME's own owned data
// (preview_site_settings()) instead of any tenant's sb_site_settings row. See
// pages/preview/[theme]/[[page]].vue for why preview switched to this from
// useSiteSettings(tenantId) — the theme now owns its own nav/menu, so preview
// should show exactly what Apply Theme would actually produce.
export async function usePreviewSiteSettings(theme: { themeId?: number; slug?: string }) {
  const requestFetch = useRequestFetch()
  const key = theme.slug || theme.themeId || 'unknown'

  // Same-origin proxy (server/api/preview/site-settings.get.ts), not a direct
  // call to config.stratumInternalUrl from this composable -- that value is
  // server-only (nuxt.config.ts) and this composable has no `watch`, so it
  // normally only ever runs once during SSR, but a client-side-only first
  // navigation into a preview page (e.g. clicking "View Demo" from the public
  // /themes gallery via <NuxtLink>, with no prior SSR payload for this exact
  // route) would run it in the browser instead, where that config value
  // resolves to undefined -- see pages/preview/[theme]/[[page]].vue's fuller
  // comment on the same class of bug, confirmed live 2026-09-23.
  const { data: settings } = await useAsyncData<SiteSettings | null>(
    `preview-settings-${key}`,
    () => requestFetch('/api/preview/site-settings', { query: theme }).catch(() => null),
    { server: true }
  )

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
    announcementShowCountdown: false, announcementCountdownEnd: null,
    announcementFontSize: 13,
    announcementCountdownFontSize: 13, announcementCountdownBold: true,
    aiBubbleEnabled: false, aiBubblePosition: 'bottom-right',
    aiBubbleAssistantName: null, aiBubbleGreeting: null,
    aiBubbleStarterPrompts: null, aiBubbleAccentColor: null, aiBubbleSystemPrompt: null,
    aiBubbleProxyEndpoint: null, aiBubbleApiKey: null,
    ...(settings.value ?? {}),
  }))

  return { settings, s }
}
