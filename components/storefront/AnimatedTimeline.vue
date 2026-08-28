<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h, type PropType } from 'vue'

type TimelineItem = { date?: string; title?: string; description?: string; image?: string; icon?: string; color?: string }
type Layout = 'alternating' | 'left' | 'cards'

const props = withDefaults(defineProps<{
  headline?: string
  subheadline?: string
  layout?: Layout
  lineColor?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  borderRadius?: number
  items?: TimelineItem[]
}>(), {
  layout: 'alternating',
  lineColor: '#2563eb',
  backgroundColor: '#f8fafc',
  cardColor: '#ffffff',
  textColor: '#1e293b',
  borderRadius: 12,
})

const defaultItems: TimelineItem[] = [
  { date: '2019', title: 'The Beginning', description: 'Founded in a small garage with a big dream — to bring quality products directly to customers without the markup.', image: '', icon: '🌱', color: '#10b981' },
  { date: '2020', title: 'First 1 000 Orders', description: 'Despite a challenging year globally, we hit our first major milestone. Proof that our community believed in what we were building.', image: '', icon: '📦', color: '#f59e0b' },
  { date: '2022', title: 'Online Store Launch', description: 'Launched our fully branded e-commerce store and expanded our product range to over 200 SKUs.', image: '', icon: '🛍', color: '#2563eb' },
  { date: '2024', title: "South Africa's Best", description: "Recognised as one of South Africa's fastest-growing independent retailers by the SA Retail Association.", image: '', icon: '🏆', color: '#8b5cf6' },
  { date: '2025', title: 'Going National', description: 'Opened two physical flagship stores in Cape Town and Johannesburg, bridging the online and in-store experience.', image: '', icon: '📍', color: '#ef4444' },
]

const items = computed(() => (props.items?.length ? props.items : defaultItems))
const isAlternating = computed(() => props.layout === 'alternating')

// Mirrors the "cardNode" reused by the 'left' and 'alternating' layouts in the
// Puck/React source (studio-app/src/components/Advanced/AnimatedTimeline.tsx) —
// kept as a local component here so both layouts render byte-for-byte the same
// markup instead of drifting apart the way the old stub implementation did.
const TimelineCard = defineComponent({
  props: {
    item: { type: Object as PropType<TimelineItem>, required: true },
    cardColor: { type: String, required: true },
    textColor: { type: String, required: true },
    borderRadius: { type: Number, required: true },
    dotColor: { type: String, required: true },
    maxWidth: { type: String, default: undefined },
  },
  setup(p) {
    return () => h('div', {
      style: {
        backgroundColor: p.cardColor,
        borderRadius: `${p.borderRadius}px`,
        padding: '22px 26px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: `1px solid ${p.textColor}10`,
        flex: 1,
        maxWidth: p.maxWidth,
      },
    }, [
      p.item.image ? h('img', {
        src: p.item.image,
        alt: p.item.title,
        style: { width: '100%', borderRadius: `${p.borderRadius / 2}px`, marginBottom: '16px', objectFit: 'cover', maxHeight: '180px', display: 'block' },
      }) : null,
      p.item.date ? h('span', {
        style: { fontSize: '12px', fontWeight: 700, color: p.dotColor, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' },
      }, p.item.date) : null,
      h('h3', { style: { color: p.textColor, fontSize: '18px', fontWeight: 700, margin: '0 0 10px', lineHeight: 1.35 } }, p.item.title),
      p.item.description ? h('p', {
        style: { color: p.textColor, opacity: 0.65, fontSize: '14px', lineHeight: 1.7, margin: 0 },
      }, p.item.description) : null,
    ])
  },
})

const itemRefs = ref<(HTMLElement | null)[]>([])
const visible = ref<boolean[]>([])

function setItemRef(el: Element | null, i: number) {
  itemRefs.value[i] = el as HTMLElement | null
}

onMounted(() => {
  itemRefs.value.forEach((el, i) => {
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        visible.value[i] = true
        obs.disconnect()
      }
    }, { threshold: 0.15 })
    obs.observe(el)
  })
})

function isLeftItem(i: number) {
  return props.layout === 'alternating' && i % 2 !== 0
}

function dotColor(item: TimelineItem) {
  return item.color || props.lineColor
}

function itemStyle(i: number) {
  const v = !!visible.value[i]
  if (props.layout === 'cards') {
    return {
      opacity: v ? 1 : 0,
      transform: v ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s ease ${i * 0.1}s, transform 0.7s ease ${i * 0.1}s`,
      display: 'flex', gap: '20px', alignItems: 'flex-start',
    }
  }
  if (props.layout === 'left') {
    return {
      opacity: v ? 1 : 0,
      transform: v ? 'translateX(0)' : 'translateX(-28px)',
      transition: `opacity 0.65s ease ${i * 0.12}s, transform 0.65s ease ${i * 0.12}s`,
      display: 'flex', alignItems: 'flex-start', paddingLeft: '52px', position: 'relative',
    }
  }
  const left = isLeftItem(i)
  return {
    opacity: v ? 1 : 0,
    transform: v ? 'translateX(0)' : `translateX(${left ? '28px' : '-28px'})`,
    transition: `opacity 0.65s ease ${i * 0.12}s, transform 0.65s ease ${i * 0.12}s`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: left ? 'flex-end' : 'flex-start',
    gap: '48px',
    position: 'relative',
  }
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor, padding: '72px 24px' }">
    <div :style="{ maxWidth: isAlternating ? '1100px' : '760px', margin: '0 auto' }">
      <div v-if="headline || subheadline" style="text-align:center;margin-bottom:64px;">
        <!-- sb-text-fluid-md (assets/css/responsive.css) scales this down on
             narrow screens instead of staying fixed at 36px. -->
        <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color: textColor, fontWeight: 800, margin: '0 0 14px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor, opacity: 0.65, fontSize: '18px', margin: 0, lineHeight: 1.65 }">{{ subheadline }}</p>
      </div>

      <div style="position:relative;">
        <div v-if="layout !== 'cards'" :style="{
          position: 'absolute', top: 0, bottom: 0,
          left: isAlternating ? '50%' : '22px',
          transform: isAlternating ? 'translateX(-50%)' : 'none',
          width: '2px',
          backgroundColor: lineColor + '30',
        }" />

        <div style="display:flex;flex-direction:column;gap:40px;">
          <div v-for="(item, i) in items" :key="i" :ref="(el) => setItemRef(el as Element | null, i)" :style="itemStyle(i)">

            <template v-if="layout === 'cards'">
              <div style="flex-shrink:0;margin-top:4px;">
                <div :style="{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: dotColor(item) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }">
                  {{ item.icon || '◆' }}
                </div>
              </div>
              <div :style="{ flex: 1, backgroundColor: cardColor, borderRadius: borderRadius + 'px', padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${textColor}10` }">
                <span v-if="item.date" :style="{ fontSize: '12px', fontWeight: 700, color: dotColor(item), letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }">{{ item.date }}</span>
                <h3 :style="{ color: textColor, fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }">{{ item.title }}</h3>
                <p v-if="item.description" :style="{ color: textColor, opacity: 0.65, fontSize: '14px', lineHeight: 1.7, margin: 0 }">{{ item.description }}</p>
              </div>
            </template>

            <template v-else-if="layout === 'left'">
              <div :style="{ position: 'absolute', left: '15px', top: '20px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: dotColor(item), border: `3px solid ${cardColor}`, boxShadow: `0 0 0 2px ${dotColor(item)}40`, zIndex: 1 }" />
              <div v-if="item.icon" :style="{ position: 'absolute', left: '4px', top: '9px', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: dotColor(item) + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }">{{ item.icon }}</div>
              <TimelineCard :item="item" :card-color="cardColor" :text-color="textColor" :border-radius="borderRadius" :dot-color="dotColor(item)" />
            </template>

            <template v-else>
              <template v-if="isLeftItem(i)">
                <div style="flex:1;display:flex;justify-content:flex-end;">
                  <TimelineCard :item="item" :card-color="cardColor" :text-color="textColor" :border-radius="borderRadius" :dot-color="dotColor(item)" max-width="calc(50% - 48px)" />
                </div>
                <div style="position:absolute;left:50%;transform:translateX(-50%);top:22px;z-index:1;display:flex;flex-direction:column;align-items:center;">
                  <div :style="{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: dotColor(item), border: '3px solid white', boxShadow: `0 0 0 2px ${dotColor(item)}40` }" />
                </div>
                <div style="flex:1;" />
              </template>
              <template v-else>
                <div style="flex:1;" />
                <div style="position:absolute;left:50%;transform:translateX(-50%);top:22px;z-index:1;">
                  <div :style="{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: dotColor(item), border: '3px solid white', boxShadow: `0 0 0 2px ${dotColor(item)}40` }" />
                </div>
                <div style="flex:1;">
                  <TimelineCard :item="item" :card-color="cardColor" :text-color="textColor" :border-radius="borderRadius" :dot-color="dotColor(item)" max-width="calc(50% - 48px)" />
                </div>
              </template>
            </template>

          </div>
        </div>
      </div>
    </div>
  </section>
</template>
