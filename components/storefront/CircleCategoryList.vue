<script setup lang="ts">
type CircleItem = {
  imageUrl?: string
  label?: string
  linkUrl?: string
}

const props = defineProps<{
  headline?: string
  items?: CircleItem[]
  circleSize?: number
  itemSpacing?: number
  labelFontSize?: number
  labelColor?: string
  backgroundColor?: string
  paddingVertical?: number
  showBorder?: boolean
  borderColor?: string
  justify?: string
}>()

const justifyMap: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
}

const justifyContent = computed(() => justifyMap[props.justify || 'center'] || 'center')
const size = computed(() => props.circleSize || 100)
const bc = computed(() => props.borderColor || '#e2e8f0')
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#ffffff', padding: `${paddingVertical || 40}px 24px` }">
    <div :style="{ maxWidth:'1200px', margin:'0 auto' }">
      <h3
        v-if="headline"
        :style="{ textAlign:'center', fontSize:'24px', fontWeight:700, color:'#1e293b', margin:'0 0 32px' }"
      >{{ headline }}</h3>

      <div :style="{
        display:'flex', flexWrap:'wrap', alignItems:'flex-start',
        justifyContent: justifyContent,
        gap:`${itemSpacing || 32}px`,
      }">
        <a
          v-for="(item, i) in items"
          :key="i"
          :href="item.linkUrl || undefined"
          :style="{
            display:'flex', flexDirection:'column', alignItems:'center',
            width:`${size + 20}px`, textDecoration:'none',
            cursor: item.linkUrl ? 'pointer' : 'default',
          }"
        >
          <div :style="{
            width:`${size}px`, height:`${size}px`, borderRadius:'50%', overflow:'hidden',
            border: showBorder !== false ? `1px solid ${bc}` : 'none',
            backgroundColor:'#e2e8f0',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.label || ''"
              style="width:100%;height:100%;object-fit:cover;display:block"
            />
            <span v-else style="font-size:11px;color:#94a3b8;font-weight:600;text-align:center;padding:0 6px">
              {{ item.label }}
            </span>
          </div>
          <span :style="{
            marginTop:'12px', fontSize:`${labelFontSize || 14}px`, fontWeight:600,
            color: labelColor || '#1e293b', textAlign:'center', lineHeight:1.3,
          }">{{ item.label }}</span>
        </a>
      </div>
    </div>
  </section>
</template>
