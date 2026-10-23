<script setup lang="ts">
import type { WcProduct } from '~/server/utils/woocommerce'

// Mirrors studio-app/src/components/Commerce/ScrollShowcase.tsx: a tall scroll section pinned to the screen
// (position: sticky). A hero image fills the screen, then shrinks into the middle as the visitor scrolls while a
// product card slides in on each side. Keep the numbers and apply()/update() maths identical to the studio file.
//
// The animated styles (widths, heights, opacity, transform) are written straight to the elements from the scroll
// handler, not through the template, so Vue re-renders never reset them mid-scroll.
type ProductRef = { id: number; slug: string; name: string } | null

const props = withDefaults(defineProps<{
  image?: string
  headline?: string
  body?: string
  textColor?: string
  overlayOpacity?: number
  leftProduct?: ProductRef
  rightProduct?: ProductRef
  scrollLength?: number
  endImageWidth?: number
  endImageHeight?: number
  cardRadius?: number
  backgroundColor?: string
  showNames?: boolean
  showPrices?: boolean
}>(), {
  showNames: true,
  showPrices: true,
})

const MOBILE_MAX_PX = 768
const SHRINK_SHARE = 0.8
const CARD_START = 0.3

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

const endW = computed(() => props.endImageWidth ?? 36)
const endH = computed(() => props.endImageHeight ?? 82)
const radius = computed(() => props.cardRadius ?? 24)

// useRequestFetch() (not plain $fetch) so this internal SSR call carries the original request's Host header.
const requestFetch = useRequestFetch()
const { suffix: previewSuffix } = usePreviewThemeQuery()

async function loadProduct(ref: ProductRef | undefined): Promise<WcProduct | null> {
  if (!ref?.slug) return null
  try {
    return await requestFetch<WcProduct>(`/api/products/${encodeURIComponent(ref.slug)}`)
  } catch {
    return null // not found / not in the buyer's catalog: that card is simply left out
  }
}
const { data: left }  = await useAsyncData<WcProduct | null>(`scroll-showcase-l-${props.leftProduct?.slug ?? ''}`,  () => loadProduct(props.leftProduct),  { default: () => null })
const { data: right } = await useAsyncData<WcProduct | null>(`scroll-showcase-r-${props.rightProduct?.slug ?? ''}`, () => loadProduct(props.rightProduct), { default: () => null })

function price(product: WcProduct) {
  return listingPrice(product) // B2B (Session 4): trade / shop-window aware, identical text for a retail product
}

const outerEl  = ref<HTMLElement | null>(null)
const leftEl   = ref<HTMLElement | null>(null)
const centerEl = ref<HTMLElement | null>(null)
const rightEl  = ref<HTMLElement | null>(null)

let removeListeners: (() => void) | null = null

function apply(e: number, narrow: boolean) {
  const centerPct = lerp(100, narrow ? 88 : endW.value, e)
  const sidePct   = narrow ? 0 : (100 - centerPct) / 2
  const reveal    = narrow ? 0 : clamp((e - CARD_START) / (1 - CARD_START), 0, 1)
  const c = centerEl.value
  if (c) {
    c.style.width = `${centerPct}%`
    c.style.height = `${lerp(100, narrow ? 70 : endH.value, e)}vh`
    c.style.borderRadius = `${lerp(0, radius.value, e)}px`
  }
  for (const [slot, side] of [[leftEl.value, -1], [rightEl.value, 1]] as const) {
    if (!slot) continue
    slot.style.display = narrow ? 'none' : 'flex'
    slot.style.width = `${sidePct}%`
    const card = slot.firstElementChild as HTMLElement | null
    if (card) {
      card.style.opacity = String(reveal)
      card.style.transform = `translateX(${(1 - reveal) * 70 * side}px)`
    }
  }
}

onMounted(() => {
  const outer = outerEl.value
  const win = outer?.ownerDocument?.defaultView
  if (!outer || !win) return
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) outer.style.height = '100vh' // no scroll effect: show the finished layout

  let ticking = false
  function update() {
    ticking = false
    const rect = outer!.getBoundingClientRect()
    const total = Math.max(1, rect.height - win!.innerHeight)
    const p = reduced ? 1 : clamp(-rect.top / total, 0, 1)
    apply(ease(clamp(p / SHRINK_SHARE, 0, 1)), win!.innerWidth < MOBILE_MAX_PX)
  }
  function onScroll() {
    if (!ticking) { ticking = true; win!.requestAnimationFrame(update) }
  }
  update()
  win.addEventListener('scroll', onScroll, { passive: true })
  win.addEventListener('resize', onScroll)
  removeListeners = () => {
    win.removeEventListener('scroll', onScroll)
    win.removeEventListener('resize', onScroll)
  }
})

onUnmounted(() => removeListeners?.())

</script>

<template>
  <div ref="outerEl" :style="{ position: 'relative', height: `${Math.max(150, scrollLength || 250)}vh`, backgroundColor: backgroundColor || '#ffffff' }">
    <div style="position:sticky;top:0;height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center;">
      <div ref="leftEl" style="display:flex;align-items:center;justify-content:center;width:0%;padding:0 clamp(8px,2vw,32px);box-sizing:border-box;overflow:hidden;">
        <div v-if="left" style="width:100%;max-width:380px;opacity:0;will-change:transform,opacity;">
          <a :href="`/product/${left.slug}${previewSuffix}`" style="display:block;text-decoration:none;color:inherit;">
            <div :style="{ aspectRatio: '4/5', borderRadius: `${radius}px`, overflow: 'hidden', background: '#f1f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
              <img v-if="left.images?.[0]" :src="left.images[0].src" :alt="left.images[0].alt || left.name" draggable="false" loading="lazy" style="width:100%;height:100%;object-fit:contain;display:block;" />
              <span v-else style="font-size:34px;opacity:0.4;">📷</span>
            </div>
            <div v-if="showNames || showPrices" style="padding:14px 4px 0;">
              <p v-if="showNames" style="margin:0 0 4px;font-size:14px;color:#1a202c;">{{ left.name }}</p>
              <p v-if="showPrices" style="margin:0;font-size:15px;font-weight:700;color:#1a202c;">{{ price(left) }}</p>
            </div>
          </a>
        </div>
      </div>

      <div ref="centerEl" style="position:relative;flex:0 0 auto;width:100%;height:100vh;overflow:hidden;background-color:#1e293b;">
        <div :style="{ position: 'absolute', inset: 0, backgroundImage: image ? `url(${image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }" />
        <div :style="{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${clamp(overlayOpacity ?? 0, 0, 100) / 100})` }" />
        <div :style="{ position: 'absolute', left: 0, right: 0, bottom: '8%', padding: '0 5%', textAlign: 'center', color: textColor || '#ffffff' }">
          <h2 v-if="headline" style="margin:0 auto 14px;max-width:640px;font-size:clamp(26px,3.6vw,52px);font-weight:600;line-height:1.15;white-space:pre-line;">{{ headline }}</h2>
          <p v-if="body" style="margin:0 auto;max-width:520px;font-size:clamp(13px,1.2vw,16px);line-height:1.6;white-space:pre-line;">{{ body }}</p>
        </div>
      </div>

      <div ref="rightEl" style="display:flex;align-items:center;justify-content:center;width:0%;padding:0 clamp(8px,2vw,32px);box-sizing:border-box;overflow:hidden;">
        <div v-if="right" style="width:100%;max-width:380px;opacity:0;will-change:transform,opacity;">
          <a :href="`/product/${right.slug}${previewSuffix}`" style="display:block;text-decoration:none;color:inherit;">
            <div :style="{ aspectRatio: '4/5', borderRadius: `${radius}px`, overflow: 'hidden', background: '#f1f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
              <img v-if="right.images?.[0]" :src="right.images[0].src" :alt="right.images[0].alt || right.name" draggable="false" loading="lazy" style="width:100%;height:100%;object-fit:contain;display:block;" />
              <span v-else style="font-size:34px;opacity:0.4;">📷</span>
            </div>
            <div v-if="showNames || showPrices" style="padding:14px 4px 0;">
              <p v-if="showNames" style="margin:0 0 4px;font-size:14px;color:#1a202c;">{{ right.name }}</p>
              <p v-if="showPrices" style="margin:0;font-size:15px;font-weight:700;color:#1a202c;">{{ price(right) }}</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
