<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps<{
  platform?: 'instagram' | 'twitter' | 'tiktok'
  username?: string
  twitterTimelineHeight?: number
  tiktokVideoUrl?: string
  instagramColumns?: 2 | 3 | 4
  instagramCount?: number
  headline?: string
  showFollowButton?: boolean
  backgroundColor?: string
  textColor?: string
  accentColor?: string
  borderRadius?: number
}>()

const IG_COLORS = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecdd3', '#ddd6fe', '#fed7aa', '#a5f3fc', '#fbcfe8', '#d9f99d']
const platformLinks: Record<string, string> = { instagram: 'https://instagram.com/', twitter: 'https://twitter.com/', tiktok: 'https://tiktok.com/@' }
const platformColors: Record<string, string> = { instagram: '#e1306c', twitter: '#000', tiktok: '#ff0050' }

const platform  = computed(() => props.platform || 'instagram')
const columns   = computed(() => props.instagramColumns || 3)
const count     = computed(() => props.instagramCount ?? 9)
const radius    = computed(() => props.borderRadius ?? 12)
const twitterHeight = computed(() => props.twitterTimelineHeight || 480)
const brandColor    = computed(() => platformColors[platform.value] || props.accentColor || '#e1306c')
const followUrl     = computed(() => `${platformLinks[platform.value]}${props.username}`)

function igColor(i: number) {
  return IG_COLORS[i % IG_COLORS.length]
}

const twitterContainer = ref<HTMLDivElement | null>(null)

function loadTwitterWidget() {
  if (!props.username || !twitterContainer.value) return

  twitterContainer.value.innerHTML = `<a class="twitter-timeline" data-height="${twitterHeight.value}" data-theme="light" href="https://twitter.com/${props.username}?ref_src=twsrc%5Etfw">Tweets by @${props.username}</a>`

  const existing = document.getElementById('twitter-widget-script')
  if (existing) {
    // @ts-ignore
    if (window.twttr?.widgets) window.twttr.widgets.load(twitterContainer.value)
    return
  }
  const script   = document.createElement('script')
  script.id      = 'twitter-widget-script'
  script.src     = 'https://platform.twitter.com/widgets.js'
  script.async   = true
  script.charset = 'utf-8'
  document.head.appendChild(script)
}

onMounted(() => {
  if (platform.value === 'twitter') nextTick(loadTwitterWidget)
})
watch([() => props.username, twitterHeight, platform], () => {
  if (platform.value === 'twitter') nextTick(loadTwitterWidget)
})

const tiktokId = computed(() => {
  const m = (props.tiktokVideoUrl || '').match(/video\/(\d+)/)
  return m ? m[1] : ''
})
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div style="max-width:960px;margin:0 auto;">
      <div v-if="headline || showFollowButton" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:36px;flex-wrap:wrap;gap:12px;">
        <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '28px', fontWeight: 800, margin: 0 }">{{ headline }}</h2>
        <a
          v-if="showFollowButton && username"
          :href="followUrl"
          target="_blank"
          rel="noopener noreferrer"
          :style="{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: brandColor, color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }"
        >
          <svg v-if="platform === 'instagram'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
          <svg v-else-if="platform === 'twitter'" width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.733-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" /></svg>
          <span v-else style="font-size:16px;">🎵</span>
          Follow @{{ username }}
        </a>
      </div>

      <div v-if="platform === 'instagram'">
        <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '4px' }">
          <div
            v-for="i in count"
            :key="i"
            :style="{ aspectRatio: '1/1', backgroundColor: igColor(i - 1), borderRadius: `${radius / 3}px`, overflow: 'hidden', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }"
          >
            <span style="font-size:22px;opacity:0.4;">📷</span>
          </div>
        </div>
        <div :style="{ marginTop: '16px', padding: '12px 16px', backgroundColor: (accentColor || '#e1306c') + '10', borderRadius: '8px', border: `1px dashed ${accentColor || '#e1306c'}44` }">
          <p :style="{ color: textColor || '#1e293b', fontSize: '13px', margin: 0, opacity: 0.7 }">
            ℹ️ Instagram live feed requires the <strong>Instagram Basic Display API</strong> connected via your store settings. The grid above is a style preview.
            <template v-if="username"> Configure <strong>@{{ username }}</strong> in Settings → Integrations.</template>
          </p>
        </div>
      </div>

      <div v-else-if="platform === 'twitter'">
        <div
          v-if="!username"
          :style="{ height: `${twitterHeight}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${textColor || '#1e293b'}30`, borderRadius: '12px', color: textColor || '#1e293b', opacity: 0.5 }"
        >
          <div :style="{ color: accentColor || '#e1306c', marginBottom: '12px' }">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.733-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" /></svg>
          </div>
          <p style="margin:0;font-size:14px;">Enter a Twitter / X username in the panel</p>
        </div>
        <div v-else ref="twitterContainer" :style="{ minHeight: `${twitterHeight}px` }" />
      </div>

      <div v-else-if="platform === 'tiktok'">
        <div
          v-if="!tiktokId"
          :style="{ height: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed #e2e8f0', borderRadius: `${radius}px`, color: '#64748b' }"
        >
          <span style="font-size:36px;margin-bottom:12px;">🎵</span>
          <p style="margin:0;font-size:14px;">Paste a TikTok video URL in the panel</p>
          <p style="margin:6px 0 0;font-size:12px;opacity:0.6;">e.g. https://www.tiktok.com/@user/video/1234567890</p>
        </div>
        <div v-else style="display:flex;justify-content:center;">
          <iframe :src="`https://www.tiktok.com/embed/v2/${tiktokId}`" allow="autoplay; fullscreen; picture-in-picture" :style="{ width: '325px', height: '580px', border: 'none', borderRadius: `${radius}px` }" />
        </div>
      </div>
    </div>
  </section>
</template>
