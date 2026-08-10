<script setup lang="ts">
// Fixed bottom-right WhatsApp chat button — site-wide chrome like SiteHeader/
// SiteFooter, rendered by layouts/default.vue around every page, sourced from the
// same sb_site_settings row (server/utils/stratum.ts's SiteSettings interface).
// Ported 1:1 from studio-app's components/Navigation/WhatsAppWidget.tsx so both
// renderers behave identically — keep both in sync.
import type { SiteSettings } from '~/server/utils/stratum'

const props = defineProps<{ settings: SiteSettings }>()

const open = ref(false)

const color = computed(() => props.settings.whatsappButtonColor || '#25D366')
const title = computed(() => props.settings.whatsappMessageTitle || 'Chat with us on WhatsApp!')
const body  = computed(() => props.settings.whatsappMessageBody || 'Hello, how can we help you?')
const waUrl = computed(() => `https://wa.me/${props.settings.whatsappPhone}?text=${encodeURIComponent(body.value)}`)
const visible = computed(() => Boolean(props.settings.whatsappEnabled && props.settings.whatsappPhone))

function handleButtonClick() {
  if (props.settings.whatsappPopupEnabled) {
    open.value = !open.value
  } else if (import.meta.client) {
    window.open(waUrl.value, '_blank', 'noopener')
  }
}
</script>

<template>
  <div v-if="visible" style="position:fixed;bottom:24px;right:24px;z-index:9998">
    <div
      v-if="open && settings.whatsappPopupEnabled"
      style="width:280px;margin-bottom:12px;border-radius:12px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.24);background-color:#fff"
    >
      <div :style="{ backgroundColor: color, color: '#fff', padding: '14px 16px', fontSize: '14px', fontWeight: 700 }">
        {{ title }}
      </div>
      <div style="padding:16px">
        <p style="margin:0 0 14px;font-size:13px;color:#334155">{{ body }}</p>
        <a
          :href="waUrl"
          target="_blank"
          rel="noopener"
          :style="{ display: 'block', textAlign: 'center', padding: '10px 12px', borderRadius: '8px', backgroundColor: color, color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }"
        >
          Start Chat
        </a>
      </div>
    </div>
    <button
      type="button"
      aria-label="Chat on WhatsApp"
      :style="{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: color, boxShadow: '0 6px 16px rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }"
      @click="handleButtonClick"
    >
      <!-- Real WhatsApp glyph (Simple Icons "whatsapp" path) rather than an emoji --
           recognisable brand mark, matches studio-app's WhatsAppWidget.tsx 1:1. -->
      <svg viewBox="0 0 24 24" width="30" height="30" fill="#fff" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
      </svg>
    </button>
  </div>
</template>
