<script setup lang="ts">
// Mirrors studio-app/src/components/Content/ButtonBlock.tsx prop-for-prop (keep SIZES identical).
// NOTE: Vue casts an absent Boolean prop to false, which is the right default for openInNewTab.
const props = defineProps<{
  label?: string
  url?: string
  openInNewTab?: boolean
  align?: 'left' | 'center' | 'right'
  variant?: 'solid' | 'outline'
  size?: 'small' | 'medium' | 'large'
  buttonColor?: string
  textColor?: string
  borderRadius?: number
}>()

const SIZES = {
  small:  { padding: '8px 18px',  fontSize: '13px' },
  medium: { padding: '12px 28px', fontSize: '15px' },
  large:  { padding: '16px 40px', fontSize: '17px' },
} as const

const s = computed(() => SIZES[props.size ?? 'medium'] ?? SIZES.medium)
const colour = computed(() => props.buttonColor || '#2563eb')
const outline = computed(() => props.variant === 'outline')

// Merchant-typed link: never let a script URL through.
const href = computed(() => {
  const u = (props.url || '').trim()
  return !u || /^(javascript|data|vbscript):/i.test(u) ? '#' : u
})
</script>

<template>
  <div v-if="label" :style="{ textAlign: align || 'left' }">
    <a
      class="btnblk"
      :href="href"
      :target="openInNewTab ? '_blank' : undefined"
      :rel="openInNewTab ? 'noopener noreferrer' : undefined"
      :style="{
        display: 'inline-block',
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 700,
        lineHeight: 1.2,
        textDecoration: 'none',
        borderRadius: `${borderRadius ?? 8}px`,
        backgroundColor: outline ? 'transparent' : colour,
        color: outline ? colour : (textColor || '#ffffff'),
        border: `2px solid ${colour}`,
      }"
    >{{ label }}</a>
  </div>
</template>

<style scoped>
.btnblk { transition: opacity 0.15s; }
.btnblk:hover { opacity: 0.88; }
</style>
