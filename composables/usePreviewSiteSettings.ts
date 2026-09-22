import { fetchPreviewSiteSettings, type SiteSettings } from '~/server/utils/stratum'

// Theme-preview counterpart to useSiteSettings() — same "fetch with graceful
// defaults" shape (defaults kept byte-identical to that composable's, so a
// theme with no chrome captured yet renders exactly like a brand-new tenant's
// real storefront would), but sourced from the THEME's own owned data
// (preview_site_settings()) instead of any tenant's sb_site_settings row. See
// pages/preview/[theme]/[[page]].vue for why preview switched to this from
// useSiteSettings(tenantId) — the theme now owns its own nav/menu, so preview
// should show exactly what Apply Theme would actually produce.
export async function usePreviewSiteSettings(theme: { themeId?: number; slug?: string }) {
  const config = useRuntimeConfig()
  const key = theme.slug || theme.themeId || 'unknown'

  const { data: settings } = await useAsyncData<SiteSettings | null>(
    `preview-settings-${key}`,
    () => fetchPreviewSiteSettings(config.stratumInternalUrl, theme),
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
