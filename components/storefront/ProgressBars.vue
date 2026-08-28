<script setup lang="ts">
// Vue twin of studio-app's ProgressBars.tsx ("Progress Bars" block).
// Rebuilt 2026-08-28 — the previous version had a real, severe prop-shape
// mismatch: it read a `bars` prop, but the Puck editor saves `items` (see
// ProgressBars.tsx's ComponentConfig.fields). That means a merchant's real
// configured bars NEVER rendered on the live storefront — `bars` was always
// undefined, so this file silently fell back to its own hardcoded fake data
// ("Skill One 85%", "Skill Two 72%", "Skill Three 90%") on every real page.
// Also missing entirely: barStyle (rounded/flat/segmented/stepped — only
// "rounded" existed, hardcoded), per-item suffix/icon, barHeight,
// showIcons, trackColor, borderRadius, and the scroll-triggered reveal
// animation (bars just rendered already-filled). Found while doing an
// unrelated mobile-responsive pass; rebuilt from ProgressBars.tsx directly.

type BarItem = { label: string; value: number; color: string; suffix?: string; icon?: string }
type BarStyle = 'rounded' | 'flat' | 'segmented' | 'stepped'

const props = defineProps<{
  headline?:        string
  subheadline?:     string
  barStyle?:        BarStyle
  barHeight?:       number
  showValues?:      boolean
  showIcons?:       boolean
  backgroundColor?: string
  trackColor?:      string
  textColor?:       string
  borderRadius?:    number
  items?:           BarItem[]
}>()

const DEFAULT_ITEMS: BarItem[] = [
  { label: 'Product Design',   value: 92, color: '#2563eb', suffix: '%', icon: '✏️' },
  { label: 'Customer Service', value: 98, color: '#10b981', suffix: '%', icon: '🤝' },
  { label: 'Delivery Speed',   value: 87, color: '#f59e0b', suffix: '%', icon: '🚀' },
  { label: 'Quality Control',  value: 95, color: '#8b5cf6', suffix: '%', icon: '✅' },
  { label: 'Sustainability',   value: 78, color: '#06b6d4', suffix: '%', icon: '🌿' },
]

const barHeight   = computed(() => props.barHeight ?? 14)
const barStyle    = computed(() => props.barStyle || 'rounded')
const trackColor  = computed(() => props.trackColor || '#e2e8f0')
const textColor   = computed(() => props.textColor || '#1e293b')
const borderRadius = computed(() => props.borderRadius ?? 12)
const showValues  = computed(() => props.showValues !== false)
const showIcons   = computed(() => props.showIcons !== false)
const items       = computed(() => (props.items?.length ? props.items : DEFAULT_ITEMS))

// Same reveal-on-scroll trigger as ProgressBars.tsx's IntersectionObserver —
// bars render at width:0 until this section scrolls into view, then
// transition to their real width. Matches ProgressBars.tsx's own actual
// behavior exactly, including that `animateOnView` isn't read there either
// (a pre-existing no-op prop in the React component, not something to
// silently "fix" here beyond matching what React actually does).
const sectionEl = ref<HTMLElement | null>(null)
const animated  = ref(false)

onMounted(() => {
  const el = sectionEl.value
  if (!el) return
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) animated.value = true
  }, { threshold: 0.2 })
  observer.observe(el)
  onBeforeUnmount(() => observer.disconnect())
})

function radiusFor(style: BarStyle) {
  return style === 'flat' ? 0 : style === 'segmented' ? 2 : barHeight.value / 2
}
function clampPct(v: number) { return Math.min(100, Math.max(0, v)) }
</script>

<template>
  <section ref="sectionEl" :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div style="max-width:800px;margin:0 auto;">
      <div v-if="headline || subheadline" style="margin-bottom:44px;">
        <!-- sb-text-fluid-md (assets/css/responsive.css) scales this headline between
             mobile and desktop instead of staying fixed at 32px -->
        <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color: textColor, fontWeight: 800, margin: '0 0 12px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor, opacity: 0.65, fontSize: '17px', margin: 0, lineHeight: 1.65 }">{{ subheadline }}</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:28px;">
        <div v-for="(item, i) in items" :key="i">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span v-if="showIcons && item.icon" style="font-size:20px">{{ item.icon }}</span>
              <span :style="{ color: textColor, fontSize: '15px', fontWeight: 600 }">{{ item.label }}</span>
            </div>
            <span v-if="showValues" :style="{ color: item.color, fontSize: '14px', fontWeight: 700 }">{{ clampPct(item.value) }}{{ item.suffix ?? '%' }}</span>
          </div>

          <!-- Segmented: 10 discrete blocks -->
          <div v-if="barStyle === 'segmented'" style="display:flex;gap:3px;">
            <div
              v-for="seg in 10" :key="seg"
              class="pb-seg"
              :style="{
                flex: 1,
                height: `${barHeight}px`,
                borderRadius: `${radiusFor('segmented')}px`,
                backgroundColor: (animated ? clampPct(item.value) : 0) >= seg * 10 ? item.color : trackColor,
                opacity: (animated ? clampPct(item.value) : 0) >= seg * 10 ? 1 : 0.35,
                transitionDelay: `${(seg - 1) * 0.07}s`,
              }"
            />
          </div>

          <!-- Stepped: rising columns -->
          <div v-else-if="barStyle === 'stepped'" style="display:flex;gap:2px;align-items:flex-end;">
            <div
              v-for="step in 10" :key="step"
              :style="{
                flex: 1,
                height: `${barHeight * (0.4 + (step - 1) * 0.07)}px`,
                borderRadius: `${radiusFor('stepped')}px ${radiusFor('stepped')}px 0 0`,
                backgroundColor: clampPct(item.value) >= step * 10 ? item.color : trackColor,
                opacity: clampPct(item.value) >= step * 10 ? (animated ? 1 : 0.3) : 0.25,
                transition: `opacity 0.5s ${(step - 1) * 0.07}s, background-color 0.5s ${(step - 1) * 0.07}s`,
              }"
            />
          </div>

          <!-- Rounded / flat: single continuous track -->
          <div v-else :style="{ height: `${barHeight}px`, backgroundColor: trackColor, borderRadius: `${radiusFor(barStyle)}px`, overflow: 'hidden', position: 'relative' }">
            <div
              class="pb-bar"
              :style="{
                height: '100%',
                width: `${animated ? clampPct(item.value) : 0}%`,
                backgroundColor: item.color,
                borderRadius: `${radiusFor(barStyle)}px`,
                backgroundImage: barStyle === 'flat' ? undefined : `linear-gradient(90deg, ${item.color}cc, ${item.color})`,
                transitionDelay: `${i * 0.12}s`,
                position: 'relative',
                overflow: 'hidden',
              }"
            >
              <div v-if="barStyle === 'rounded' && barHeight >= 12" style="position:absolute;inset:0;background-image:linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 100%);" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pb-bar { transition: width 1.1s cubic-bezier(0.4, 0, 0.2, 1); }
.pb-seg { transition: opacity 0.8s ease, background-color 0.8s ease; }
</style>
