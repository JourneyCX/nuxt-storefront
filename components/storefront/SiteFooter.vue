<script setup lang="ts">
// Header/Footer are no longer Puck page components — they're fixed chrome rendered
// by layouts/default.vue around every page, sourced from one sb_site_settings row
// per tenant instead of per-page puck_json. See
// docs/site_settings_architecture_investigation.md. Field names below match
// server/utils/stratum.ts's SiteSettings interface (the site_settings API response).
import type { SiteSettings } from '~/server/utils/stratum'

const props = defineProps<{ settings: SiteSettings }>()

const SOCIAL_ICONS: Record<string, string> = {
  instagram: '📷', facebook: '📘', pinterest: '📌', twitter: '🐦',
  x: '✕', tiktok: '🎵', youtube: '▶️', linkedin: '💼',
}

function socialIcon(platform: string): string {
  return SOCIAL_ICONS[(platform || '').toLowerCase()] ?? (platform || '🔗')
}

const hasColumns    = computed(() => (props.settings.footerColumns ?? []).length > 0)
const hasSocial     = computed(() => (props.settings.socialLinks ?? []).length > 0)
const hasBrandBlock = computed(() => Boolean(props.settings.businessName || props.settings.tagline))
const showRichRow   = computed(() => hasBrandBlock.value || hasColumns.value || hasSocial.value)
// New field, not part of the original per-page Header/Footer schema — conditionally
// rendered so a tenant with none of these set (every migrated tenant, today) sees no
// visual change at all.
const hasContact = computed(() => Boolean(
  props.settings.contactPhone || props.settings.contactEmail || props.settings.contactAddress
))
</script>

<template>
  <footer :style="{ backgroundColor: settings.footerBackgroundColor||'#1a202c', color: settings.footerTextColor||'#a0aec0', padding:'32px 24px', textAlign:'center' }">
    <div style="max-width:1200px;margin:0 auto">
      <div
        v-if="showRichRow"
        style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:32px;text-align:left;padding-bottom:24px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.15)"
      >
        <div v-if="hasBrandBlock">
          <div v-if="settings.businessName" :style="{ fontSize:'18px', fontWeight:700, color: settings.footerTextColor||'#a0aec0' }">{{ settings.businessName }}</div>
          <div v-if="settings.tagline" style="font-size:13px;opacity:0.85;margin-top:6px">{{ settings.tagline }}</div>
          <div v-if="hasContact" style="font-size:13px;opacity:0.85;margin-top:10px;line-height:1.6">
            <div v-if="settings.contactAddress">{{ settings.contactAddress }}</div>
            <div v-if="settings.contactPhone">{{ settings.contactPhone }}</div>
            <div v-if="settings.contactEmail">{{ settings.contactEmail }}</div>
          </div>
        </div>
        <div v-for="(col, i) in (settings.footerColumns || [])" :key="i">
          <div :style="{ fontWeight:600, marginBottom:'10px', color: settings.footerAccentColor || settings.footerTextColor || '#a0aec0' }">{{ col.heading }}</div>
          <a
            v-for="(link, j) in (col.links || [])" :key="j" :href="link.url"
            :style="{ display:'block', marginBottom:'6px', fontSize:'13px', opacity:0.85, textDecoration:'none', color: settings.footerTextColor||'#a0aec0' }"
          >{{ link.label }}</a>
        </div>
        <div v-if="hasSocial" style="display:flex;gap:12px;align-items:flex-start">
          <a
            v-for="(social, i) in (settings.socialLinks || [])" :key="i" :href="social.url" :title="social.platform"
            :style="{ fontSize:'18px', textDecoration:'none', color: settings.footerTextColor||'#a0aec0' }"
          >{{ socialIcon(social.platform) }}</a>
        </div>
      </div>
      <p style="margin:0 0 10px;font-size:13px">
        <a href="/returns" :style="{ color: settings.footerTextColor||'#a0aec0', textDecoration:'underline', opacity:0.85 }">Returns &amp; Exchanges</a>
      </p>
      <p style="margin:0;font-size:14px">{{ settings.footerCopyrightText || '© My Store' }}</p>
    </div>
  </footer>
</template>
