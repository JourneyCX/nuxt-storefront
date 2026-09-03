<script setup lang="ts">
// Header/Footer are no longer Puck page components — they're fixed chrome rendered
// by layouts/default.vue around every page, sourced from one sb_site_settings row
// per tenant instead of per-page puck_json. See
// docs/site_settings_architecture_investigation.md. Field names below match
// server/utils/stratum.ts's SiteSettings interface (the site_settings API response).
import type { SiteSettings } from '~/server/utils/stratum'
// Explicit import for the same reason SiteHeader/SiteFooter need one in
// layouts/default.vue: components under components/storefront/ resolve via
// Nuxt's directory-based auto-import as <StorefrontCartDrawer>, not
// <CartDrawer>. The bare <CartDrawer /> tag this file used before never
// resolved to a real component at all -- confirmed directly: a console.log
// placed inside CartDrawer's own setup() never printed in either the
// server or the client logs, for any request, which rules out a
// hydration-recovery issue and points at component resolution itself.
// Every attempted fix to CartDrawer.vue's own template (wrapping element,
// Teleport, v-show) was irrelevant, since the component was never being
// instantiated in the first place.
import CartDrawer from '~/components/storefront/CartDrawer.vue'

const props = defineProps<{ settings: SiteSettings }>()

const { itemCount, openCart, fetchCart } = useCart()
const { account, fetchAccount } = useAccount()

onMounted(() => {
  fetchCart()
  fetchAccount()
})

// Mobile nav panel open/closed, and which top-level links (by index) have
// their children expanded — a tap-to-expand accordion, since the desktop
// dropdown below is :hover-driven and doesn't work on touch at all.
const mobileOpen = ref(false)
const expanded = ref<Set<number>>(new Set())

function toggleExpanded(i: number) {
  const next = new Set(expanded.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  expanded.value = next
}

function closeMobileMenu() {
  mobileOpen.value = false
}

const navLinks = computed(() => props.settings.navLinks || [])
</script>

<template>
  <header :style="{ backgroundColor: settings.headerBackgroundColor || '#fff', color: settings.headerTextColor || '#1a202c', position: settings.headerSticky ? 'sticky' : 'relative', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }">
    <div style="max-width:1200px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between">
      <a href="/" style="text-decoration:none">
        <img v-if="settings.logoUrl" :src="settings.logoUrl" :alt="settings.logoAlt || 'Store logo'" :style="{ height: (settings.headerLogoHeight || 40) + 'px', objectFit: 'contain' }" />
        <span v-else :style="{ fontSize:'20px',fontWeight:700,color:settings.headerTextColor||'#1a202c' }">{{ settings.logoText || settings.businessName || 'Your Store' }}</span>
      </a>

      <!-- Desktop nav — unchanged hover-dropdown behavior, hidden below the
           mobile breakpoint (assets/css/responsive.css). Wrapped in a plain
           div with no inline style of its own so .sb-nav-desktop-only's
           block/none toggle isn't fighting the nav's own display:flex. -->
      <div class="sb-nav-desktop-only">
        <nav style="display:flex;gap:28px">
          <div v-for="link in navLinks" :key="link.url" class="sb-nav-item" style="position:relative">
            <a :href="link.url"
               :style="{ color:settings.headerTextColor||'#1a202c',textDecoration:'none',fontSize:'15px',fontWeight:'500',fontFamily:'\'Montserrat\',sans-serif',display:'flex',alignItems:'center',gap:'4px' }">
              {{ link.label }}
              <span v-if="(link.children?.length ?? 0) > 0" style="font-size:10px">▾</span>
            </a>
            <div v-if="(link.children?.length ?? 0) > 0" class="sb-nav-dropdown" style="position:absolute;top:100%;left:0;padding-top:8px;z-index:200">
              <div style="background-color:#fff;color:#1a202c;min-width:160px;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.16);padding:6px 0">
                <a v-for="child in link.children" :key="child.url" :href="child.url" style="display:block;padding:8px 14px;color:#1a202c;text-decoration:none;font-size:14px">
                  {{ child.label }}
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div style="display:flex;align-items:center;gap:16px">
        <a
          v-if="settings.headerCtaText"
          class="sb-nav-desktop-only"
          :href="settings.headerCtaUrl || '#'"
          :style="{ backgroundColor: settings.headerAccentColor || settings.headerTextColor || '#1a202c', color:'#ffffff', padding:'8px 16px', borderRadius:'4px', fontSize:'14px', fontWeight:600, textDecoration:'none' }"
        >{{ settings.headerCtaText }}</a>
        <a
          :href="account ? '/account' : '/login'"
          :style="{ display:'inline-flex', background:'none', border:'none', cursor:'pointer', padding:'4px', lineHeight:1, textDecoration:'none', color: settings.headerTextColor || '#1a202c' }"
          :aria-label="account ? 'My Account' : 'Log In'"
        >
          <!-- Thin-line user icon (FA Classic Thin "user" style — no FA Pro
               license in this project, so hand-built to match its weight).
               stroke="currentColor" reads the `color` set above, which is
               explicit (not just inherited) because <a> and <button> get a
               UA-stylesheet default color (link blue, ButtonText) that beats
               plain inheritance — confirmed live on a dark header banner
               (Burnstein/tenant 82), where the icons rendered link-blue /
               near-black instead of following headerTextColor. -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
          </svg>
        </a>
        <button
          @click="openCart"
          :style="{ position:'relative', display:'inline-flex', background:'none', border:'none', cursor:'pointer', padding:'4px', color: settings.headerTextColor || '#1a202c' }"
          aria-label="Open cart"
        >
          <!-- Thin-line cart icon (FA Classic Thin "cart-shopping" style, hand-built for the same reason). -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span
            v-if="itemCount > 0"
            :style="{ position:'absolute', top:'-2px', right:'-4px', background:'#e53e3e', color:'#fff', borderRadius:'50%', fontSize:'11px', fontWeight:700, minWidth:'18px', height:'18px', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }"
          >{{ itemCount }}</span>
        </button>
        <button
          v-if="navLinks.length > 0"
          type="button"
          class="sb-nav-mobile-only"
          @click="mobileOpen = !mobileOpen"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileOpen"
          :style="{ background:'none', border:'none', cursor:'pointer', fontSize:'24px', color: settings.headerTextColor || '#1a202c', padding:'4px', lineHeight:1 }"
        >{{ mobileOpen ? '✕' : '☰' }}</button>
      </div>
    </div>

    <!-- Mobile nav panel — a stacked list, not a hover dropdown, so
         multi-level links use tap-to-expand instead of a :hover pattern
         that has no equivalent on touch. -->
    <nav v-if="mobileOpen" class="sb-nav-mobile-only" style="border-top:1px solid rgba(0,0,0,0.08)">
      <div v-for="(link, i) in navLinks" :key="link.url" style="border-bottom:1px solid rgba(0,0,0,0.06)">
        <div style="display:flex;align-items:center">
          <a
            :href="link.url"
            @click="closeMobileMenu"
            :style="{ flex:1, padding:'14px 24px', color:settings.headerTextColor||'#1a202c', textDecoration:'none', fontSize:'16px', fontWeight:'500', fontFamily:'\'Montserrat\',sans-serif' }"
          >{{ link.label }}</a>
          <button
            v-if="(link.children?.length ?? 0) > 0"
            type="button"
            @click="toggleExpanded(i)"
            :aria-label="expanded.has(i) ? `Collapse ${link.label}` : `Expand ${link.label}`"
            :aria-expanded="expanded.has(i)"
            :style="{ background:'none', border:'none', padding:'14px 24px', cursor:'pointer', fontSize:'14px', color:settings.headerTextColor||'#1a202c' }"
          >{{ expanded.has(i) ? '▴' : '▾' }}</button>
        </div>
        <div v-if="(link.children?.length ?? 0) > 0 && expanded.has(i)" style="padding-bottom:8px">
          <a
            v-for="child in link.children"
            :key="child.url"
            :href="child.url"
            @click="closeMobileMenu"
            :style="{ display:'block', padding:'10px 24px 10px 40px', color:settings.headerTextColor||'#1a202c', opacity:0.85, textDecoration:'none', fontSize:'15px' }"
          >{{ child.label }}</a>
        </div>
      </div>
    </nav>
  </header>

  <CartDrawer />
</template>

<style scoped>
.sb-nav-dropdown { display: none; }
.sb-nav-item:hover .sb-nav-dropdown { display: block; }
</style>
