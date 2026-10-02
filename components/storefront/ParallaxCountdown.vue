<script setup lang="ts">
// Mirrors studio-app/src/components/Media/ParallaxCountdown.tsx — a Countdown
// Timer rendered as the fixed content of a Parallax Section. Composes the
// existing ParallaxSection.vue (layers, Depth Drift / Sticky Reveal) and
// CountdownTimer.vue (embedded: no own padding/background) rather than
// re-implementing either, so fixes to those carry over here automatically.
import ParallaxSection from './ParallaxSection.vue'
import CountdownTimer from './CountdownTimer.vue'

type MidgroundPosition = 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

const props = withDefaults(defineProps<{
  // Countdown
  targetDate?: string
  headline?: string
  subheadline?: string
  endMessage?: string
  showDays?: boolean
  showHours?: boolean
  showMinutes?: boolean
  showSeconds?: boolean
  cardStyle?: 'card' | 'minimal' | 'neon'
  accentColor?: string
  cardColor?: string
  headingColor?: string
  textColor?: string
  labelColor?: string
  digitScale?: number
  digitsOffsetY?: number
  primaryButtonText?: string
  primaryButtonUrl?: string
  // Parallax
  scrollMode?: 'drift' | 'sticky'
  stickyScrollLength?: number
  backgroundImage?: string
  backgroundSpeed?: number
  midgroundImage?: string
  midgroundSpeed?: number
  midgroundWidth?: number
  midgroundPosition?: MidgroundPosition
  overlayColor?: string
  overlayOpacity?: number
  minHeight?: number
  contentAlign?: 'top' | 'center' | 'bottom'
  contentMaxWidth?: number
  forceAnimation?: boolean
  // Layout extras
  countdownPosition?: 'left' | 'center' | 'right' | 'split'
  headlinePosition?: 'left' | 'center' | 'right'
  headlineVertical?: 'top' | 'center' | 'bottom'
  timerVertical?: 'top' | 'center' | 'bottom'
  showSeparators?: boolean
  backgroundFit?: 'cover' | 'contain'
  sectionBackgroundColor?: string
}>(), {
  // Vue casts absent booleans to false — blocks saved before this option
  // existed must keep their separators.
  showSeparators: true,
})

// Mirrors ParallaxCountdown.tsx: legacy 'split' = headline left, timer right;
// headline follows the timer when unset; different sides → full-width row.
const timerPos = computed(() => props.countdownPosition === 'split' ? 'right' : (props.countdownPosition || 'center'))
const headlinePos = computed(() => props.headlinePosition ?? (props.countdownPosition === 'split' ? 'left' : timerPos.value))
// Unset (older blocks) = the section-wide contentAlign, as before.
const headlineV = computed(() => props.headlineVertical ?? props.contentAlign ?? 'center')
const timerV = computed(() => props.timerVertical ?? props.contentAlign ?? 'center')
const gridMode = computed(() => headlinePos.value !== timerPos.value || headlineV.value !== timerV.value)

const parallaxProps = computed(() => ({
  scrollMode: props.scrollMode,
  stickyScrollLength: props.stickyScrollLength,
  backgroundImage: props.backgroundImage,
  backgroundSpeed: props.backgroundSpeed,
  midgroundImage: props.midgroundImage,
  midgroundSpeed: props.midgroundSpeed,
  midgroundWidth: props.midgroundWidth,
  midgroundPosition: props.midgroundPosition,
  overlayColor: props.overlayColor,
  overlayOpacity: props.overlayOpacity,
  minHeight: props.minHeight,
  contentAlign: props.contentAlign,
  contentMaxWidth: props.contentMaxWidth,
  forceAnimation: props.forceAnimation,
  contentHorizontalAlign: gridMode.value ? 'split' : timerPos.value,
  backgroundFit: props.backgroundFit || 'cover',
  sectionBackgroundColor: props.sectionBackgroundColor,
}))

const timerProps = computed(() => ({
  targetDate: props.targetDate,
  headline: props.headline,
  subheadline: props.subheadline,
  endMessage: props.endMessage,
  showDays: props.showDays,
  showHours: props.showHours,
  showMinutes: props.showMinutes,
  showSeconds: props.showSeconds,
  cardStyle: props.cardStyle,
  accentColor: props.accentColor,
  cardColor: props.cardColor,
  headingColor: props.headingColor,
  textColor: props.textColor,
  labelColor: props.labelColor,
  digitScale: props.digitScale,
  digitsOffsetY: props.digitsOffsetY,
  primaryButtonText: props.primaryButtonText,
  primaryButtonUrl: props.primaryButtonUrl,
  backgroundColor: 'transparent',
  backgroundImage: '',
  embedded: true,
  align: timerPos.value,
  headlineAlign: headlinePos.value,
  headlineVAlign: headlineV.value,
  timerVAlign: timerV.value,
  showSeparators: props.showSeparators,
}))
</script>

<template>
  <ParallaxSection v-bind="parallaxProps">
    <CountdownTimer v-bind="timerProps" />
  </ParallaxSection>
</template>
