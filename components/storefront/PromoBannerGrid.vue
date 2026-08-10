<script setup lang="ts">
type PromoBanner = {
  image?: string
  title?: string
  subtitle?: string
  buttonText?: string
  buttonUrl?: string
  buttonStyle?: 'solid' | 'outline' | 'none'
  bannerClickable?: boolean
  overlayOpacity?: number
  textPosition?: string
}

const props = defineProps<{
  banners?: PromoBanner[]
  columns?: number
  gap?: number
  aspectRatio?: string
  bannerHeight?: number
  backgroundColor?: string
  paddingVertical?: number
}>()

const posMap: Record<string, { alignItems: string; justifyContent: string; textAlign: string }> = {
  'top-left':      { alignItems:'flex-start', justifyContent:'flex-start', textAlign:'left' },
  'top-center':    { alignItems:'flex-start', justifyContent:'center',     textAlign:'center' },
  'center':        { alignItems:'center',     justifyContent:'center',     textAlign:'center' },
  'bottom-left':   { alignItems:'flex-end',   justifyContent:'flex-start', textAlign:'left' },
  'bottom-center': { alignItems:'flex-end',   justifyContent:'center',     textAlign:'center' },
  'bottom-right':  { alignItems:'flex-end',   justifyContent:'flex-end',   textAlign:'right' },
}

function pos(b: PromoBanner) {
  return posMap[b.textPosition || 'center'] ?? posMap['center']
}

function containerStyle(b: PromoBanner, _i: number) {
  const ar = props.aspectRatio || '3/2'
  const base = {
    position: 'relative' as const,
    overflow: 'hidden',
    borderRadius: '2px',
    display: 'block',
  }
  return ar === 'auto'
    ? { ...base, height: `${props.bannerHeight || 380}px` }
    : { ...base, aspectRatio: ar }
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#f7f7f7', padding:`${paddingVertical || 24}px 24px` }">
    <div :style="{ maxWidth:'1200px', margin:'0 auto' }">
      <div :style="{
        display:'grid',
        gridTemplateColumns:`repeat(${columns || 2}, 1fr)`,
        gap:`${gap || 12}px`,
      }">
        <component
          :is="banner.bannerClickable !== false ? 'a' : 'div'"
          v-for="(banner, i) in banners"
          :key="i"
          :href="banner.bannerClickable !== false ? (banner.buttonUrl || '#') : undefined"
          :style="{ textDecoration:'none', cursor: banner.bannerClickable !== false ? 'pointer' : 'default', ...containerStyle(banner, i) }"
        >
          <!-- Background layer -->
          <div :style="{
            position:'absolute', inset:0,
            backgroundImage: banner.image ? `url('${banner.image}')` : undefined,
            backgroundColor: `hsl(${i * 45 + 200}, 20%, 70%)`,
            backgroundSize:'cover', backgroundPosition:'center',
          }" />
          <!-- Overlay -->
          <div
            v-if="(banner.overlayOpacity || 0) > 0"
            :style="{ position:'absolute', inset:0, backgroundColor:`rgba(0,0,0,${(banner.overlayOpacity || 25)/100})` }"
          />

          <!-- Text -->
          <div :style="{
            position:'absolute', inset:0, zIndex:1,
            display:'flex', flexDirection:'column',
            alignItems: pos(banner).alignItems,
            justifyContent: pos(banner).justifyContent,
            textAlign: pos(banner).textAlign as any,
            padding:'32px',
          }">
            <h3
              v-if="banner.title"
              style="color:#fff;font-size:28px;font-weight:800;margin:0 0 8px;letter-spacing:0.03em;text-transform:uppercase;text-shadow:0 1px 6px rgba(0,0,0,0.5)"
            >{{ banner.title }}</h3>
            <p
              v-if="banner.subtitle"
              style="color:rgba(255,255,255,0.9);font-size:15px;margin:0 0 20px;text-shadow:0 1px 4px rgba(0,0,0,0.4)"
            >{{ banner.subtitle }}</p>
            <!-- Whole-banner mode: button is decorative -->
            <span
              v-if="banner.buttonText && banner.buttonStyle !== 'none' && banner.bannerClickable !== false"
              :style="{
                display:'inline-block', padding:'10px 24px',
                fontSize:'13px', fontWeight:700,
                letterSpacing:'0.08em', textTransform:'uppercase',
                borderRadius:'2px', border:'2px solid #fff',
                backgroundColor: banner.buttonStyle === 'solid' ? '#fff' : 'transparent',
                color: banner.buttonStyle === 'solid' ? '#1a202c' : '#fff',
              }"
            >{{ banner.buttonText }}</span>
            <!-- Button-only mode: button is the real link -->
            <a
              v-if="banner.buttonText && banner.buttonStyle !== 'none' && banner.bannerClickable === false"
              :href="banner.buttonUrl || '#'"
              :style="{
                display:'inline-block', padding:'10px 24px',
                fontSize:'13px', fontWeight:700,
                letterSpacing:'0.08em', textTransform:'uppercase',
                borderRadius:'2px', border:'2px solid #fff',
                textDecoration:'none',
                backgroundColor: banner.buttonStyle === 'solid' ? '#fff' : 'transparent',
                color: banner.buttonStyle === 'solid' ? '#1a202c' : '#fff',
              }"
            >{{ banner.buttonText }}</a>
          </div>
        </component>
      </div>
    </div>
  </section>
</template>
