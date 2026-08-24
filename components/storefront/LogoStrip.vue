<script setup lang="ts">
type LogoItem = {
  imageUrl?: string
  altText?: string
  linkUrl?: string
}

const props = defineProps<{
  headline?: string
  logos?: LogoItem[]
  logoHeight?: number
  logoSpacing?: number
  backgroundColor?: string
  borderTop?: boolean
  borderBottom?: boolean
  borderColor?: string
  paddingVertical?: number
  grayscale?: boolean
  justify?: string
}>()

const justifyMap: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
}

const justifyContent = computed(() => justifyMap[props.justify || 'center'] || 'center')
const bc = computed(() => props.borderColor || '#e2e8f0')
</script>

<template>
  <section :style="{
    backgroundColor: backgroundColor || '#ffffff',
    padding: `${paddingVertical || 32}px 24px`,
    borderTop:    borderTop    !== false ? `1px solid ${bc}` : 'none',
    borderBottom: borderBottom !== false ? `1px solid ${bc}` : 'none',
  }">
    <div :style="{ maxWidth:'1200px', margin:'0 auto' }">
      <p
        v-if="headline"
        :style="{ textAlign:'center', fontSize:'13px', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#94a3b8', margin:'0 0 24px' }"
      >{{ headline }}</p>

      <div :style="{
        display:'flex', flexWrap:'wrap', alignItems:'center',
        justifyContent: justifyContent,
        gap:`${logoSpacing || 32}px`,
      }">
        <template v-for="(logo, i) in logos" :key="i">
          <!-- Placeholder when no image -->
          <div
            v-if="!logo.imageUrl"
            :style="{
              height:`${logoHeight || 120}px`, width:`${(logoHeight || 120) * 2}px`,
              backgroundColor:'#e2e8f0', borderRadius:'4px',
              display:'flex', alignItems:'center', justifyContent:'center',
            }"
          >
            <span style="font-size:11px;color:#94a3b8;font-weight:600">{{ logo.altText }}</span>
          </div>

          <!-- Logo with link -->
          <a
            v-else-if="logo.linkUrl"
            :href="logo.linkUrl"
            style="display:block;line-height:0"
          >
            <img
              :src="logo.imageUrl"
              :alt="logo.altText || ''"
              :style="{
                height:`${logoHeight || 120}px`, width:'auto',
                objectFit:'contain', display:'block',
                filter: grayscale !== false ? 'grayscale(100%) opacity(0.6)' : 'none',
                transition:'filter 0.2s ease',
              }"
              @mouseenter="(e) => { if (grayscale !== false) (e.target as HTMLImageElement).style.filter = 'none' }"
              @mouseleave="(e) => { if (grayscale !== false) (e.target as HTMLImageElement).style.filter = 'grayscale(100%) opacity(0.6)' }"
            />
          </a>

          <!-- Logo without link -->
          <img
            v-else
            :src="logo.imageUrl"
            :alt="logo.altText || ''"
            :style="{
              height:`${logoHeight || 120}px`, width:'auto',
              objectFit:'contain', display:'block',
              filter: grayscale !== false ? 'grayscale(100%) opacity(0.6)' : 'none',
              transition:'filter 0.2s ease',
            }"
            @mouseenter="(e) => { if (grayscale !== false) (e.target as HTMLImageElement).style.filter = 'none' }"
            @mouseleave="(e) => { if (grayscale !== false) (e.target as HTMLImageElement).style.filter = 'grayscale(100%) opacity(0.6)' }"
          />
        </template>
      </div>
    </div>
  </section>
</template>
