<script setup lang="ts">
// Mirrors studio-app/src/components/Content/ContactDetails.tsx: a card of the store's contact details (address, phone,
// email, optional opening hours) with icons. Values come from Site Settings (via /api/contact-info) unless overridden
// on the block. Phone and email are real tel:/mailto: links here (not in the editor).
//
// NOTE: Vue casts an absent Boolean prop to false, so the show* switches that default to true use withDefaults().
const props = withDefaults(defineProps<{
  heading?: string
  intro?: string
  showAddress?: boolean
  showPhone?: boolean
  showEmail?: boolean
  addressLabel?: string
  phoneLabel?: string
  emailLabel?: string
  hoursLabel?: string
  hours?: string
  addressOverride?: string
  phoneOverride?: string
  emailOverride?: string
  backgroundColor?: string
  textColor?: string
  iconBackground?: string
  dividerColor?: string
  cardRadius?: number
  fontFamily?: string
  headingFontSize?: number
  introFontSize?: number
  labelFontSize?: number
  valueFontSize?: number
}>(), {
  showAddress: true,
  showPhone: true,
  showEmail: true,
})

const { previewTheme } = usePreviewThemeQuery()
const requestFetch = useRequestFetch()
const { data: contact } = await useAsyncData<{ phone: string | null; email: string | null; address: string | null } | null>(
  `contact-info-${previewTheme.value ?? 'live'}`,
  () => requestFetch('/api/contact-info', { query: { previewTheme: previewTheme.value || undefined } }).catch(() => null),
  { default: () => null },
)

const address = computed(() => props.addressOverride?.trim() || contact.value?.address || '')
const phone   = computed(() => props.phoneOverride?.trim()   || contact.value?.phone   || '')
const email   = computed(() => props.emailOverride?.trim()   || contact.value?.email   || '')
const hours   = computed(() => props.hours?.trim() || '')

// Digits and a leading + only, so "+27 (0)21 555 0100" still dials.
const telHref  = computed(() => `tel:${phone.value.replace(/(?!^\+)[^\d]/g, '')}`)
const mailHref = computed(() => `mailto:${email.value.replace(/\s/g, '')}`)

const text = computed(() => props.textColor || '#1a1a1a')
const iconBg = computed(() => props.iconBackground || '#f1f2f5')
const line = computed(() => props.dividerColor || '#e5e7eb')
const valueSize = computed(() => props.valueFontSize ? `${props.valueFontSize}px` : 'clamp(17px,1.7vw,22px)')

const rows = computed(() => {
  const r: Array<{ key: string; icon: string; label: string; value: string; href?: string }> = []
  if (props.showAddress && address.value) r.push({ key: 'a', icon: 'address', label: props.addressLabel || 'Address', value: address.value })
  if (props.showPhone && phone.value)     r.push({ key: 'p', icon: 'phone',   label: props.phoneLabel   || 'Phone',   value: phone.value, href: telHref.value })
  if (props.showEmail && email.value)     r.push({ key: 'e', icon: 'email',   label: props.emailLabel   || 'Email',   value: email.value, href: mailHref.value })
  if (hours.value)                        r.push({ key: 'h', icon: 'hours',   label: props.hoursLabel   || 'Opening Hours', value: hours.value })
  return r
})
</script>

<template>
  <div :style="{ background: backgroundColor || '#ffffff', color: text, borderRadius: `${cardRadius ?? 20}px`, padding: 'clamp(24px, 4vw, 56px)', ...(fontFamily ? { fontFamily } : {}) }">
    <h2 v-if="heading" style="margin:0 0 18px;font-weight:600;line-height:1.15;" :style="{ fontSize: headingFontSize ? `${headingFontSize}px` : 'clamp(28px,4vw,48px)' }">{{ heading }}</h2>
    <p v-if="intro" style="margin:0 0 12px;line-height:1.6;white-space:pre-line;" :style="{ fontSize: introFontSize ? `${introFontSize}px` : 'clamp(16px,1.5vw,19px)' }">{{ intro }}</p>
    <div v-if="rows.length" style="margin-top:24px;">
      <div
        v-for="(row, i) in rows"
        :key="row.key"
        :style="{ display: 'flex', alignItems: 'center', gap: '28px', padding: '28px 0', borderTop: i === 0 ? undefined : `1px solid ${line}` }"
      >
        <div :style="{ flex: '0 0 auto', width: '68px', height: '68px', borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <template v-if="row.icon === 'address'"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></template>
            <path v-else-if="row.icon === 'phone'" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
            <template v-else-if="row.icon === 'email'"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></template>
            <template v-else><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></template>
          </svg>
        </div>
        <div style="min-width:0;">
          <div style="margin-bottom:8px;" :style="{ fontSize: `${labelFontSize || 16}px` }">{{ row.label }}</div>
          <a v-if="row.href" :href="row.href" style="line-height:1.5;color:inherit;text-decoration:none;word-break:break-word;" :style="{ fontSize: valueSize }">{{ row.value }}</a>
          <div v-else style="line-height:1.5;white-space:pre-line;word-break:break-word;" :style="{ fontSize: valueSize }">{{ row.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
