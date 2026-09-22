import { fetchSiteSettings, type SiteSettings } from '~/server/utils/stratum'

// Shared "real site settings, with graceful defaults" logic -- extracted from
// layouts/default.vue so pages/preview/[theme].vue can render the same real
// SiteHeader/SiteFooter without going through that layout (which fetches the
// TENANT's currently-applied theme's CSS, conflicting with preview's own
// per-previewed-theme CSS fetch under the same 'sb-theme-tokens' head key).
// Defaults must stay identical to what a brand-new tenant's real storefront
// renders (mid-provisioning, no sb_site_settings row yet) -- this is the one
// place they're defined now, so update here only, not per-consumer.
export async function useSiteSettings(tenantId: Ref<number>) {
  const config = useRuntimeConfig()

  const { data: settings } = await useAsyncData<SiteSettings | null>(
    `settings-${tenantId.value}`,
    () => tenantId.value ? fetchSiteSettings(config.stratumInternalUrl, tenantId.value) : Promise.resolve(null),
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
