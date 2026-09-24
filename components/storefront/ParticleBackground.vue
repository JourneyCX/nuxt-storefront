<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number
}

const props = defineProps<{
  headline?: string
  subheadline?: string
  primaryButtonText?: string
  primaryButtonUrl?: string
  primaryButtonColor?: string
  backgroundColor?: string
  particleColor?: string
  textColor?: string
  minHeight?: number
  particleCount?: number
  particleSize?: number
  speed?: number
  connectLines?: boolean
  lineColor?: string
  connectDistance?: number
}>()

const particleCount   = () => props.particleCount ?? 80
const particleColor   = () => props.particleColor ?? 'rgba(99,179,237,0.9)'
const particleSize    = () => props.particleSize ?? 3
const speed           = () => props.speed ?? 0.6
const connectLines    = () => props.connectLines ?? true
const lineColor       = () => props.lineColor ?? 'rgba(99,179,237,0.3)'
const connectDistance = () => props.connectDistance ?? 130

const canvasEl = ref<HTMLCanvasElement | null>(null)
let particles: Particle[] = []
let animFrame = 0
let ro: ResizeObserver | null = null

function resize() {
  const canvas = canvasEl.value
  if (!canvas) return
  canvas.width  = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
}

function seedParticles() {
  const canvas = canvasEl.value
  if (!canvas) return
  const count = Math.max(10, Math.min(particleCount(), 250))
  particles = Array.from({ length: count }, () => ({
    x:    Math.random() * canvas.width,
    y:    Math.random() * canvas.height,
    vx:   (Math.random() - 0.5) * speed(),
    vy:   (Math.random() - 0.5) * speed(),
    size: Math.random() * particleSize() + 1,
  }))
}

function animate() {
  const canvas = canvasEl.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = particleColor()
    ctx.globalAlpha = 0.8
    ctx.fill()
    ctx.globalAlpha = 1
  }

  if (connectLines()) {
    const dist2 = connectDistance()
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x
        const dy   = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < dist2) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = lineColor()
          ctx.globalAlpha = (1 - dist / dist2) * 0.6
          ctx.lineWidth   = 1
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    }
  }

  animFrame = requestAnimationFrame(animate)
}

function setup() {
  resize()
  seedParticles()
}

onMounted(() => {
  setup()
  animate()
  const canvas = canvasEl.value
  if (canvas) {
    ro = new ResizeObserver(resize)
    ro.observe(canvas)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animFrame)
  ro?.disconnect()
})

watch(() => [props.particleCount, props.particleSize, props.speed], setup)
</script>

<template>
  <div :style="{
    position: 'relative',
    minHeight: `${minHeight ?? 520}px`,
    backgroundColor: backgroundColor || '#0f172a',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }">
    <canvas ref="canvasEl" style="position:absolute;inset:0;width:100%;height:100%;display:block;" />
    <div v-if="headline || subheadline || primaryButtonText" style="position:relative;z-index:1;text-align:center;padding:64px 32px;max-width:680px;">
      <!-- sb-text-fluid-lg (assets/css/responsive.css) scales this down on
           narrow screens instead of staying fixed at 48px. -->
      <h2 v-if="headline" class="sb-text-fluid-lg" :style="{ color: textColor || '#fff', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.15 }">{{ headline }}</h2>
      <p v-if="subheadline" :style="{ color: textColor || '#fff', opacity: 0.75, fontSize: '19px', margin: '0 0 36px', lineHeight: 1.65 }">{{ subheadline }}</p>
      <a v-if="primaryButtonText" :href="primaryButtonUrl || '#'" :style="{ display: 'inline-block', backgroundColor: primaryButtonColor || '#3b82f6', color: '#fff', padding: '14px 36px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '16px' }">
        {{ primaryButtonText }}
      </a>
    </div>
  </div>
</template>
