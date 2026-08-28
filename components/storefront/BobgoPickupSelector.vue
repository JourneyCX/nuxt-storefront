<script setup lang="ts">
// Vue twin of studio-app's BobgoPickupSelector.tsx ("Bob Box Pickup Selector
// (Bob Go)" block). Rebuilt 2026-08-28 — this file previously had NO real
// implementation at all: a hardcoded three-fake-location placeholder with a
// completely different prop shape (headline/backgroundColor/textColor) than
// the real component (apiUrl/storeId/mapProvider/maxPoints/layout/showHours/
// accentColor/mapHeight), no event listener, no map, no confirm flow —
// meaning Bob Go pickup-point selection did not function on the live
// storefront at all, silently. Found while doing an unrelated mobile-
// responsive pass; rebuilt from BobgoPickupSelector.tsx directly, following
// the same Leaflet-map pattern already working in PickupSelector.vue.
//
// Differs from PickupSelector.vue in three ways, matching the real component:
//   - listens for 'bobgo:rate-selected', not 'shipping:rate-selected'
//   - pickup points arrive already embedded in the event's own
//     detail.pickup_points — Bob Go has no standalone pickup-points endpoint
//     to fetch from (confirmed 404 on Bob Go's real API), so there's no
//     fetchPoints()/loading state here at all, unlike the other selector.
//   - point object field names differ: id/type/distance_km/operating_hours
//     instead of pickup_point_id/pickup_point_type/trading_hours.

const props = defineProps<{
  apiUrl?:        string
  storeId?:       string
  mapProvider?:   'osm' | 'googlemaps'
  googleMapsKey?: string
  maxPoints?:     number
  layout?:        'list' | 'map' | 'split'
  showHours?:     boolean
  accentColor?:   string
  mapHeight?:     number
}>()

interface PickupPoint {
  id:               string
  name:             string
  address?:         string
  city?:            string
  type?:            'locker' | 'counter'
  lat?:             number
  lng?:             number
  distance_km?:     number
  operating_hours?: string
}

const accentColor = computed(() => props.accentColor || '#0e7490')
const maxPoints   = computed(() => props.maxPoints ?? 5)
const layout      = computed(() => props.layout || 'split')
const mapHeight   = computed(() => props.mapHeight ?? 340)
const showHours   = computed(() => props.showHours !== false)

const visible  = ref(false)
const points   = ref<PickupPoint[]>([])
const selected = ref<PickupPoint | null>(null)
const rateData = ref<unknown>(null)
const sessionToken = ref('')
const storeIdRef   = ref('')
const mapEl    = ref<HTMLDivElement | null>(null)

let leafletMap: { remove: () => void } | null = null

function onRateSelected(e: Event) {
  const detail = (e as CustomEvent).detail ?? {}
  if (detail.is_pickup_point) {
    rateData.value = detail
    points.value   = detail.pickup_points ?? []
    selected.value = null
    visible.value  = true
    sessionToken.value = detail.session_token ?? ''
    storeIdRef.value   = detail.store_id ?? ''
  } else {
    visible.value = false
    points.value  = []
    selected.value = null
    destroyMap()
  }
}

onMounted(() => document.addEventListener('bobgo:rate-selected', onRateSelected))
onBeforeUnmount(() => { document.removeEventListener('bobgo:rate-selected', onRateSelected); destroyMap() })

watch([visible, points, layout], async () => {
  if (!visible.value || layout.value === 'list') return
  if (!points.value.length) return
  await nextTick()
  await loadLeaflet()
  drawMap()
})

function destroyMap() {
  if (leafletMap) leafletMap.remove()
  leafletMap = null
}

function loadLeaflet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const w = window as Window & { L?: unknown }
  if (w.L) return Promise.resolve()

  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css'; link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.async = true; s.onload = () => resolve(); s.onerror = reject
    document.head.appendChild(s)
  })
}

function drawMap() {
  if (!mapEl.value) return
  const w = window as Window & { L?: Record<string, unknown> }
  const L = w.L
  if (!L) return

  destroyMap()

  const valid = points.value.filter(p => p.lat && p.lng).slice(0, maxPoints.value)
  if (!valid.length) return

  const mapInstance = (L['map'] as Function)(mapEl.value).setView([valid[0].lat!, valid[0].lng!], 13)
  ;(L['tileLayer'] as Function)(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenStreetMap', maxZoom: 18 }
  ).addTo(mapInstance)

  valid.forEach((p, idx) => {
    const icon = (L['divIcon'] as Function)({
      className: '',
      html: `<div style="width:28px;height:28px;background:${accentColor.value};color:#fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);"><span style="transform:rotate(45deg);font-size:11px;font-weight:700;">${idx + 1}</span></div>`,
      iconSize: [28, 28], iconAnchor: [14, 28],
    })
    const marker = (L['marker'] as Function)([p.lat!, p.lng!], { icon }).addTo(mapInstance)
    marker.bindPopup(`<strong>${p.name}</strong><br>${p.address ?? ''}`)
    marker.on('click', () => { selected.value = p })
  })

  if (valid.length > 1) {
    (mapInstance as { fitBounds: (b: unknown[], o: unknown) => void }).fitBounds(
      valid.map(p => [p.lat!, p.lng!]), { padding: [30, 30] }
    )
  }
  leafletMap = mapInstance as { remove: () => void }
}

function selectPoint(point: PickupPoint) { selected.value = point }

function confirm() {
  if (!selected.value) return
  document.dispatchEvent(new CustomEvent('bobgo:pickup-selected', {
    bubbles: true,
    detail: {
      pickup_point:  selected.value,
      rate:          rateData.value,
      session_token: sessionToken.value,
      store_id:      storeIdRef.value,
    },
  }))
}

function pointBadge(p: PickupPoint) {
  return p.type === 'locker'
    ? { label: 'Locker', bg: '#e0f7fa', color: '#0e7490' }
    : { label: 'Counter', bg: '#ede9fe', color: '#7c3aed' }
}
</script>

<template>
  <div v-if="visible" style="border:1.5px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-top:12px">
    <!-- sb-grid (assets/css/responsive.css) stacks list above map on mobile
         instead of squeezing a 300px list pane onto a 375px screen. -->
    <div class="sb-grid" :style="{ display: 'grid', gridTemplateColumns: layout === 'split' ? '300px 1fr' : undefined }">
      <div v-if="layout !== 'map'" :style="{ background: '#fff', borderRight: layout === 'split' ? '1px solid #e5e7eb' : 'none', display: 'flex', flexDirection: 'column', maxHeight: `${mapHeight}px`, overflowY: 'auto' }">
        <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">
          {{ points.length }} nearby location{{ points.length !== 1 ? 's' : '' }}
        </div>
        <div
          v-for="(p, i) in points.slice(0, maxPoints)" :key="p.id ?? i"
          role="button" tabindex="0"
          style="padding:12px 14px;border-bottom:1px solid #e5e7eb;cursor:pointer;transition:background 0.12s"
          :style="{
            background: selected?.id === p.id ? `${accentColor}14` : '#fff',
            borderLeft: selected?.id === p.id ? `3px solid ${accentColor}` : '3px solid transparent',
          }"
          @click="selectPoint(p)" @keydown.enter="selectPoint(p)" @keydown.space.prevent="selectPoint(p)"
        >
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap">
            <span style="font-weight:600;font-size:13px;color:#1f2937;flex:1">{{ p.name }}</span>
            <span :style="{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '10px', background: pointBadge(p).bg, color: pointBadge(p).color, textTransform: 'uppercase', letterSpacing: '0.3px' }">
              {{ pointBadge(p).label }}
            </span>
            <span v-if="p.distance_km != null" style="font-size:11px;color:#9ca3af">{{ Number(p.distance_km).toFixed(1) }} km</span>
          </div>
          <div style="font-size:12px;color:#6b7280">{{ p.address }}{{ p.city ? `, ${p.city}` : '' }}</div>
          <div v-if="showHours && p.operating_hours" style="font-size:11px;color:#9ca3af;margin-top:3px">{{ p.operating_hours }}</div>
        </div>
      </div>

      <div v-if="layout !== 'list'" ref="mapEl" :style="{ height: `${mapHeight}px`, minHeight: '200px', background: '#e5e7eb', flex: 1 }" />
    </div>

    <div v-if="selected" style="padding:12px 16px;border-top-width:1.5px;border-top-style:solid;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;flex-wrap:wrap" :style="{ background: `${accentColor}14`, borderTopColor: accentColor }">
      <span><strong>Selected:</strong> {{ selected.name }}{{ selected.address ? `, ${selected.address}` : '' }}</span>
      <button @click="confirm" :style="{ background: accentColor, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }">
        Confirm pickup point
      </button>
    </div>
  </div>
</template>
