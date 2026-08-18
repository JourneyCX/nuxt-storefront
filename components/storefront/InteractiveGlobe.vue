<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

type GLocation = { name: string; lat: number; lng: number; description: string; color: string }

const props = defineProps<{
  headline?: string
  subheadline?: string
  theme?: 'ocean' | 'dark' | 'green'
  autoRotate?: boolean
  rotateSpeed?: number
  globeSize?: number
  locations?: GLocation[]
  backgroundColor?: string
  textColor?: string
}>()

const theme        = () => props.theme ?? 'ocean'
const autoRotate   = () => props.autoRotate ?? true
const rotateSpeed  = () => props.rotateSpeed ?? 1
const globeSize    = () => props.globeSize ?? 520
const locations    = () => props.locations ?? []

const THEMES = {
  ocean: { base0: '#1e3a5f', base1: '#0a1628', grid: '99,179,237', glow: '59,130,246' },
  dark:  { base0: '#1a1a2e', base1: '#0d0d1a', grid: '148,163,184', glow: '148,163,184' },
  green: { base0: '#0d3320', base1: '#051a10', grid: '52,211,153', glow: '16,185,129' },
} as const

function project(lat: number, lng: number, rotation: number, cx: number, cy: number, r: number) {
  const phi    = (lat * Math.PI) / 180
  const lambda = ((lng - rotation) * Math.PI) / 180
  const x3 = Math.cos(phi) * Math.sin(lambda)
  const y3 = Math.sin(phi)
  const z3 = Math.cos(phi) * Math.cos(lambda)
  return { x: cx + x3 * r, y: cy - y3 * r, z: z3, visible: z3 > 0.05 }
}

function drawGlobe(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  rotation: number,
  themeKey: keyof typeof THEMES,
  locs: GLocation[],
  selectedIdx: number,
  pulseAnim: number
) {
  const T = THEMES[themeKey]
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  const ambient = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.45)
  ambient.addColorStop(0, `rgba(${T.glow},0.12)`)
  ambient.addColorStop(1, `rgba(${T.glow},0)`)
  ctx.fillStyle = ambient
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2); ctx.fill()

  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r)
  grad.addColorStop(0, T.base0)
  grad.addColorStop(1, T.base1)
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2); ctx.clip()

  const drawParallel = (lat: number, opacity: number, width: number) => {
    ctx.strokeStyle = `rgba(${T.grid},${opacity})`
    ctx.lineWidth = width
    ctx.beginPath()
    let first = true, lastVis = false
    for (let lng2 = 0; lng2 <= 362; lng2 += 2) {
      const p = project(lat, lng2, rotation, cx, cy, r)
      if (p.visible) { if (first || !lastVis) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); first = false }
      lastVis = p.visible
    }
    ctx.stroke()
  }

  const drawMeridian = (lng2: number) => {
    ctx.strokeStyle = `rgba(${T.grid},0.12)`; ctx.lineWidth = 0.5
    ctx.beginPath()
    let first = true, lastVis = false
    for (let lat2 = -90; lat2 <= 92; lat2 += 3) {
      const p = project(lat2, lng2, rotation, cx, cy, r)
      if (p.visible) { if (first || !lastVis) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); first = false }
      lastVis = p.visible
    }
    ctx.stroke()
  }

  for (let lat = -60; lat <= 60; lat += 30) drawParallel(lat, lat === 0 ? 0.38 : 0.14, lat === 0 ? 1 : 0.5)
  for (let lng2 = 0; lng2 < 360; lng2 += 30) drawMeridian(lng2)

  ctx.restore()

  const hl = ctx.createRadialGradient(cx - r * 0.37, cy - r * 0.4, 0, cx - r * 0.18, cy - r * 0.18, r * 0.7)
  hl.addColorStop(0, 'rgba(255,255,255,0.13)'); hl.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  ctx.strokeStyle = `rgba(${T.grid},0.22)`; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()

  locs.forEach((loc, i) => {
    const p = project(loc.lat, loc.lng, rotation, cx, cy, r)
    if (!p.visible) return

    const isSel   = i === selectedIdx
    const dotCol  = loc.color || `rgba(${T.glow},1)`
    const pulse   = isSel ? Math.abs(Math.sin(pulseAnim * 0.06)) : 0

    if (isSel) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 14 + pulse * 4, 0, Math.PI * 2)
      ctx.fillStyle = dotCol + '20'; ctx.fill()
      ctx.beginPath(); ctx.arc(p.x, p.y, 8 + pulse * 2, 0, Math.PI * 2)
      ctx.fillStyle = dotCol + '40'; ctx.fill()
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
      ctx.fillStyle = dotCol + '28'; ctx.fill()
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, isSel ? 6 : 4, 0, Math.PI * 2)
    ctx.fillStyle = dotCol; ctx.fill()
    ctx.beginPath(); ctx.arc(p.x, p.y - (isSel ? 1.5 : 1), isSel ? 2 : 1.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill()
  })
}

const canvasEl   = ref<HTMLCanvasElement | null>(null)
const wrapEl     = ref<HTMLDivElement | null>(null)
const rot        = ref(20)
const dragging   = ref(false)
const dragDelta  = ref(0)
const lastX      = ref(0)
const selected   = ref(-1)
const pulse      = ref(0)
const popup      = ref<{ x: number; y: number; loc: GLocation } | null>(null)

let animFrame = 0
let cx = 0, cy = 0, r = 0

function getCanvasCoords(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  return {
    mx: (clientX - rect.left) * (canvas.width / rect.width),
    my: (clientY - rect.top) * (canvas.height / rect.height),
  }
}

function loop() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  pulse.value++
  if (!dragging.value && autoRotate()) rot.value += rotateSpeed() * 0.1
  drawGlobe(ctx, cx, cy, r, rot.value, theme(), locations(), selected.value, pulse.value)
  animFrame = requestAnimationFrame(loop)
}

function onMouseDown(e: MouseEvent) {
  dragging.value = true
  dragDelta.value = 0
  lastX.value = e.clientX
}
function onMouseMove(e: MouseEvent) {
  if (!dragging.value) return
  const dx = e.clientX - lastX.value
  dragDelta.value += Math.abs(dx)
  rot.value -= dx * 0.4
  lastX.value = e.clientX
}
function onMouseUp(e: MouseEvent) {
  dragging.value = false
  const canvas = canvasEl.value
  if (!canvas) return
  if (dragDelta.value < 5) {
    const { mx, my } = getCanvasCoords(e.clientX, e.clientY, canvas)
    let hit = -1, minD = 18
    locations().forEach((loc, i) => {
      const p = project(loc.lat, loc.lng, rot.value, cx, cy, r)
      if (!p.visible) return
      const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2)
      if (d < minD) { minD = d; hit = i }
    })
    if (hit >= 0) {
      selected.value = hit
      const p = project(locations()[hit].lat, locations()[hit].lng, rot.value, cx, cy, r)
      const rect = canvas.getBoundingClientRect()
      popup.value = { x: rect.left + p.x * (rect.width / canvas.width), y: rect.top + p.y * (rect.height / canvas.height), loc: locations()[hit] }
    } else {
      selected.value = -1; popup.value = null
    }
  }
}

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  dragging.value = true
  dragDelta.value = 0
  lastX.value = t.clientX
}
function onTouchMove(e: TouchEvent) {
  if (!dragging.value) return
  const t = e.touches[0]
  const dx = t.clientX - lastX.value
  dragDelta.value += Math.abs(dx)
  rot.value -= dx * 0.4
  lastX.value = t.clientX
}
function onTouchEnd(e: TouchEvent) {
  dragging.value = false
  const canvas = canvasEl.value
  const t = e.changedTouches[0]
  if (!canvas || !t) return
  if (dragDelta.value < 5) {
    const { mx, my } = getCanvasCoords(t.clientX, t.clientY, canvas)
    let hit = -1, minD = 18
    locations().forEach((loc, i) => {
      const p = project(loc.lat, loc.lng, rot.value, cx, cy, r)
      if (!p.visible) return
      const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2)
      if (d < minD) { minD = d; hit = i }
    })
    if (hit >= 0) {
      selected.value = hit
      const p = project(locations()[hit].lat, locations()[hit].lng, rot.value, cx, cy, r)
      const rect = canvas.getBoundingClientRect()
      popup.value = { x: rect.left + p.x * (rect.width / canvas.width), y: rect.top + p.y * (rect.height / canvas.height), loc: locations()[hit] }
    } else {
      selected.value = -1; popup.value = null
    }
  }
}

function setupCanvas() {
  const canvas = canvasEl.value
  if (!canvas) return
  const size = globeSize()
  canvas.width  = size
  canvas.height = size
  cx = size / 2; cy = size / 2; r = size / 2 - 20
  canvas.style.cursor = 'grab'
}

onMounted(() => {
  setupCanvas()
  loop()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('touchend', onTouchEnd)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animFrame)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
})

watch(() => props.globeSize, () => setupCanvas())

function closePopup() {
  popup.value = null
  selected.value = -1
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#0f172a', padding: '72px 24px' }">
    <div v-if="headline || subheadline" style="text-align:center;margin-bottom:48px;">
      <h2 v-if="headline" :style="{ color: textColor || '#fff', fontSize: '36px', fontWeight: 800, margin: '0 0 14px' }">{{ headline }}</h2>
      <p v-if="subheadline" :style="{ color: textColor || '#fff', opacity: 0.65, fontSize: '17px', margin: 0, lineHeight: 1.65 }">{{ subheadline }}</p>
    </div>
    <div ref="wrapEl" :style="{ position: 'relative', width: `${globeSize}px`, height: `${globeSize}px`, margin: '0 auto', maxWidth: '100%' }">
      <canvas ref="canvasEl" style="display:block;max-width:100%;"
        @mousedown="onMouseDown" @touchstart="onTouchStart" />
      <div v-if="popup" :style="{
          position: 'fixed', left: `${popup.x + 14}px`, top: `${popup.y - 60}px`,
          backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
          padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 100,
          maxWidth: '220px',
        }">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div :style="{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: popup.loc.color || '#2563eb', flexShrink: 0 }" />
          <strong style="color:#1e293b;font-size:14px;">{{ popup.loc.name }}</strong>
        </div>
        <p v-if="popup.loc.description" style="color:#64748b;font-size:13px;margin:0;line-height:1.5;">{{ popup.loc.description }}</p>
        <button @click="closePopup" style="position:absolute;top:6px;right:8px;background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;line-height:1;">×</button>
      </div>
    </div>
    <p :style="{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: textColor || '#fff', opacity: 0.35 }">
      Drag to rotate · Click a marker to explore
    </p>
  </section>
</template>
