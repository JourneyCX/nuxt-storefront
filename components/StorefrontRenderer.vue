<script lang="ts">
/**
 * StorefrontRenderer renders a Puck JSON layout as static HTML.
 *
 * Puck's React runtime is not used here — we interpret the JSON ourselves
 * and map component names to Vue equivalents. This keeps the storefront
 * pure Vue/Nuxt with no React dependency in the production bundle.
 *
 * Puck stores nested content in a `zones` object (keys: "{id}:{zoneName}").
 * We resolve those recursively using h() so Container/Columns receive their
 * children as slot content, matching the DropZone behaviour in the editor.
 */

import { defineComponent, h, Suspense, type PropType } from 'vue'

// SiteHeader/SiteFooter are no longer rendered from page content — they're fixed
// chrome rendered by layouts/default.vue from sb_site_settings instead (see
// docs/site_settings_architecture_investigation.md). Deliberately not imported or
// mapped here any more; SKIP_TYPES below makes any leftover SiteHeader/SiteFooter
// entry in older stored puck_json a silent no-op instead of an "Unknown component"
// warning box.
import ContainerSF       from './storefront/Container.vue'
import ColumnsSF         from './storefront/Columns.vue'
import TextBlockSF       from './storefront/TextBlock.vue'
import ImageBlockSF      from './storefront/ImageBlock.vue'
import SpacerSF          from './storefront/Spacer.vue'
import DividerSF         from './storefront/Divider.vue'
import HeroBannerSF      from './storefront/HeroBanner.vue'
import HeroSliderSF      from './storefront/HeroSlider.vue'
import PromoBannerGridSF from './storefront/PromoBannerGrid.vue'
import LogoStripSF       from './storefront/LogoStrip.vue'
import HeroSectionSF     from './storefront/HeroSection.vue'
import ProductGridSF     from './storefront/ProductGrid.vue'
import ProductCardSF     from './storefront/ProductCard.vue'
import ProductCarouselSF from './storefront/ProductCarousel.vue'
import CollectionListSF  from './storefront/CollectionList.vue'
import FeatureGridSF     from './storefront/FeatureGrid.vue'
import ProductShowcaseSF from './storefront/ProductShowcase.vue'
import CallToActionSF    from './storefront/CallToAction.vue'
import TestimonialsSF    from './storefront/Testimonials.vue'
import FAQAccordionSF    from './storefront/FAQAccordion.vue'
import NewsletterSignupSF  from './storefront/NewsletterSignup.vue'
import TeamSectionSF       from './storefront/TeamSection.vue'
import BeforeAfterSliderSF from './storefront/BeforeAfterSlider.vue'
import CountdownTimerSF    from './storefront/CountdownTimer.vue'
import PricingTableSF    from './storefront/PricingTable.vue'
import VideoBackgroundSF from './storefront/VideoBackground.vue'
import ImageGallerySF    from './storefront/ImageGallery.vue'
import ContactFormSF     from './storefront/ContactForm.vue'
import CartWidgetSF      from './storefront/CartWidget.vue'
import ProductFilterSF   from './storefront/ProductFilter.vue'
import BlogPostListSF    from './storefront/BlogPostList.vue'
import GoogleMapSF       from './storefront/GoogleMap.vue'
import ProgressBarsSF    from './storefront/ProgressBars.vue'
import AnimatedTimelineSF   from './storefront/AnimatedTimeline.vue'
import SocialFeedSF         from './storefront/SocialFeed.vue'
import PriceCalculatorSF    from './storefront/PriceCalculator.vue'
import MultiStepFormSF      from './storefront/MultiStepForm.vue'
import ParticleBackgroundSF from './storefront/ParticleBackground.vue'
import InteractiveGlobeSF   from './storefront/InteractiveGlobe.vue'
import AIToolSF             from './storefront/AITool.vue'
import BobgoShippingOptionsSF  from './storefront/BobgoShippingOptions.vue'
import BobgoPickupSelectorSF   from './storefront/BobgoPickupSelector.vue'
import BobgoShippingSummarySF  from './storefront/BobgoShippingSummary.vue'

// Types that used to be page components and may still linger in older stored
// puck_json (pre this architecture change) — silently skipped, not rendered, not
// treated as "unknown".
const SKIP_TYPES = new Set(['SiteHeader', 'SiteFooter'])

const componentMap: Record<string, unknown> = {
  Container:        ContainerSF,
  Columns:          ColumnsSF,
  TextBlock:        TextBlockSF,
  ImageBlock:       ImageBlockSF,
  Spacer:           SpacerSF,
  Divider:          DividerSF,
  HeroBanner:       HeroBannerSF,
  HeroSlider:       HeroSliderSF,
  PromoBannerGrid:  PromoBannerGridSF,
  LogoStrip:        LogoStripSF,
  HeroSection:      HeroSectionSF,
  ProductGrid:      ProductGridSF,
  ProductCard:      ProductCardSF,
  ProductCarousel:  ProductCarouselSF,
  CollectionList:   CollectionListSF,
  FeatureGrid:      FeatureGridSF,
  ProductShowcase:  ProductShowcaseSF,
  CallToAction:     CallToActionSF,
  Testimonials:     TestimonialsSF,
  FAQAccordion:     FAQAccordionSF,
  NewsletterSignup: NewsletterSignupSF,
  TeamSection:      TeamSectionSF,
  BeforeAfterSlider: BeforeAfterSliderSF,
  CountdownTimer:   CountdownTimerSF,
  PricingTable:     PricingTableSF,
  VideoBackground:  VideoBackgroundSF,
  ImageGallery:     ImageGallerySF,
  ContactForm:      ContactFormSF,
  CartWidget:       CartWidgetSF,
  ProductFilter:    ProductFilterSF,
  BlogPostList:     BlogPostListSF,
  GoogleMap:        GoogleMapSF,
  ProgressBars:     ProgressBarsSF,
  AnimatedTimeline:   AnimatedTimelineSF,
  SocialFeed:         SocialFeedSF,
  PriceCalculator:    PriceCalculatorSF,
  MultiStepForm:      MultiStepFormSF,
  ParticleBackground: ParticleBackgroundSF,
  InteractiveGlobe:   InteractiveGlobeSF,
  AITool:             AIToolSF,
  BobgoShippingOptions: BobgoShippingOptionsSF,
  BobgoPickupSelector:  BobgoPickupSelectorSF,
  BobgoShippingSummary: BobgoShippingSummarySF,
}

interface PuckItem {
  type: string
  props: Record<string, unknown>
}

interface PuckData {
  content?: PuckItem[]
  zones?:   Record<string, PuckItem[]>
  root?:    Record<string, unknown>
}

function renderBlock(item: PuckItem, zones: Record<string, PuckItem[]>): ReturnType<typeof h> {
  const comp = componentMap[item.type] ?? null

  if (!comp) {
    return h('div', {
      style: 'padding: 8px; background: #fff3cd; font-size: 12px; color: #856404;',
    }, `Unknown component: ${item.type}`)
  }

  const itemId = item.props.id as string | undefined
  let slots: Record<string, () => ReturnType<typeof h>[]> | undefined

  if (item.type === 'Container' && itemId) {
    // DropZone name in Container.tsx is "content"
    const zoneItems = zones[`${itemId}:content`] ?? []
    slots = { default: () => zoneItems.map(child => renderBlock(child, zones)) }
  } else if (item.type === 'Columns' && itemId) {
    // DropZone names in Columns.tsx are "col-0", "col-1", … — count is driven by
    // `distribution` (e.g. 'sidebar13' = 2 cols, 'equal4' = 4 cols), not `columns`,
    // which the editor no longer writes (studio-app/src/components/Layout/Columns.tsx).
    // Reading `columns` here silently dropped any content saved in col-2/col-3 for
    // 3- and 4-column layouts, and rendered asymmetric splits (e.g. sidebar13's
    // "1fr 3fr") as plain equal-width columns.
    const numCols = (COLUMN_DISTRIBUTIONS[item.props.distribution as string] ?? COLUMN_DISTRIBUTIONS.equal2).cols
    const columnDivs = Array.from({ length: numCols }, (_, i) => {
      const zoneItems = zones[`${itemId}:col-${i}`] ?? []
      return h('div', zoneItems.map(child => renderBlock(child, zones)))
    })
    slots = { default: () => columnDivs }
  }

  return h(
    Suspense,
    {},
    {
      default:  () => h(comp as Parameters<typeof h>[0], item.props, slots),
      fallback: () => h('div', { style: 'min-height:40px' }),
    },
  )
}

export default defineComponent({
  name: 'StorefrontRenderer',
  props: {
    puckJson: {
      type:     Object as PropType<PuckData>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const data  = props.puckJson as PuckData
      // Filter out any leftover SiteHeader/SiteFooter entries from pages saved
      // before this architecture change — chrome now comes from layouts/default.vue,
      // not page content. Silently dropped, not rendered as "unknown component".
      const items = (data.content ?? []).filter(item => !SKIP_TYPES.has(item.type))
      const zones = data.zones   ?? {}

      return h(
        'div',
        { class: 'storefront', style: 'min-height: 100vh' },
        items.map(item => renderBlock(item, zones)),
      )
    }
  },
})
</script>
