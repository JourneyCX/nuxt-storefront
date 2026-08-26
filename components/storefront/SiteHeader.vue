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

defineProps<{ settings: SiteSettings }>()

const { itemCount, openCart, fetchCart } = useCart()

onMounted(() => { fetchCart() })
</script>

<template>
  <header :style="{ backgroundColor: settings.headerBackgroundColor || '#fff', color: settings.headerTextColor || '#1a202c', position: settings.headerSticky ? 'sticky' : 'relative', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }">
    <div style="max-width:1200px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between">
      <a href="/" style="text-decoration:none">
        <img v-if="settings.logoUrl" :src="settings.logoUrl" :alt="settings.logoAlt || 'Store logo'" :style="{ height: (settings.headerLogoHeight || 40) + 'px', objectFit: 'contain' }" />
        <span v-else :style="{ fontSize:'20px',fontWeight:700,color:settings.headerTextColor||'#1a202c' }">{{ settings.logoText || settings.businessName || 'Your Store' }}</span>
      </a>
      <nav style="display:flex;gap:28px">
        <div v-for="link in (settings.navLinks || [])" :key="link.url" class="sb-nav-item" style="position:relative">
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
      <div style="display:flex;align-items:center;gap:16px">
        <a
          v-if="settings.headerCtaText"
          :href="settings.headerCtaUrl || '#'"
          :style="{ backgroundColor: settings.headerAccentColor || settings.headerTextColor || '#1a202c', color:'#ffffff', padding:'8px 16px', borderRadius:'4px', fontSize:'14px', fontWeight:600, textDecoration:'none' }"
        >{{ settings.headerCtaText }}</a>
        <button
          @click="openCart"
          :style="{ position:'relative', background:'none', border:'none', cursor:'pointer', fontSize:'22px', padding:'4px' }"
          aria-label="Open cart"
        >
          🛒
          <span
            v-if="itemCount > 0"
            :style="{ position:'absolute', top:'-2px', right:'-4px', background:'#e53e3e', color:'#fff', borderRadius:'50%', fontSize:'11px', fontWeight:700, minWidth:'18px', height:'18px', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }"
          >{{ itemCount }}</span>
        </button>
      </div>
    </div>
  </header>

  <CartDrawer />
</template>

<style scoped>
.sb-nav-dropdown { display: none; }
.sb-nav-item:hover .sb-nav-dropdown { display: block; }
</style>
