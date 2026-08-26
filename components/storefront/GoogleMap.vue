<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  location?: string
  zoom?: number
  height?: number
  mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain'
  showOverlay?: boolean
  overlayTitle?: string
  overlayAddress?: string
  overlayPhone?: string
  overlayEmail?: string
  overlayButtonText?: string
  overlayButtonUrl?: string
  overlayPosition?: 'left' | 'right'
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  borderRadius?: number
}>()

const clampedZoom = computed(() => Math.min(20, Math.max(1, props.zoom || 14)))
const mapT = computed(() => {
  const t = props.mapType
  return t === 'satellite' ? 'k' : t === 'hybrid' ? 'h' : t === 'terrain' ? 'p' : 'm'
})
const iframeSrc = computed(() => props.location
  ? `https://maps.google.com/maps?q=${encodeURIComponent(props.location)}&t=${mapT.value}&z=${clampedZoom.value}&ie=UTF8&iwloc=near&output=embed`
  : '')
const dirUrl = computed(() => props.overlayButtonUrl || (props.location ? `https://maps.google.com/maps?q=${encodeURIComponent(props.location)}` : '#'))

const overlayStyle = computed(() => ({
  position: 'absolute' as const,
  top: '24px',
  [props.overlayPosition || 'left']: '24px',
  backgroundColor: '#fff',
  borderRadius: `${(props.borderRadius ?? 16) / 1.5}px`,
  padding: '24px 28px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
  maxWidth: '280px',
  zIndex: 2,
}))
</script>
<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '0' }">
    <div :style="{ position: 'relative', height: `${height || 480}px`, borderRadius: `${borderRadius ?? 16}px`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }">
      <iframe
        v-if="iframeSrc"
        :src="iframeSrc"
        width="100%"
        height="100%"
        style="border:0;display:block;"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="Google Map"
      />
      <div v-else style="width:100%;height:100%;background-color:#e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#64748b;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <p style="margin:12px 0 0;font-size:15px;">Enter a location in the panel to show the map</p>
      </div>

      <div v-if="showOverlay" :style="overlayStyle">
        <div v-if="overlayTitle" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="accentColor || '#2563eb'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <h3 :style="{ color: textColor || '#1e293b', fontSize: '17px', fontWeight: 800, margin: 0 }">{{ overlayTitle }}</h3>
        </div>
        <p v-if="overlayAddress" :style="{ color: textColor || '#1e293b', opacity: 0.7, fontSize: '14px', lineHeight: 1.6, margin: '0 0 14px', whiteSpace: 'pre-line' }">{{ overlayAddress }}</p>
        <div style="display:flex;flex-direction:column;gap:8px;" :style="{ marginBottom: overlayButtonText ? '18px' : '0' }">
          <a v-if="overlayPhone" :href="`tel:${overlayPhone}`" :style="{ display: 'flex', alignItems: 'center', gap: '8px', color: textColor || '#1e293b', opacity: 0.75, fontSize: '14px', textDecoration: 'none' }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" :stroke="accentColor || '#2563eb'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>{{ overlayPhone }}
          </a>
          <a v-if="overlayEmail" :href="`mailto:${overlayEmail}`" :style="{ display: 'flex', alignItems: 'center', gap: '8px', color: textColor || '#1e293b', opacity: 0.75, fontSize: '14px', textDecoration: 'none' }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" :stroke="accentColor || '#2563eb'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>{{ overlayEmail }}
          </a>
        </div>
        <a v-if="overlayButtonText" :href="dirUrl" target="_blank" rel="noopener noreferrer" :style="{ display: 'block', textAlign: 'center', backgroundColor: accentColor || '#2563eb', color: '#fff', padding: '10px 0', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }">
          {{ overlayButtonText }}
        </a>
      </div>
    </div>
  </section>
</template>
