<script setup lang="ts">
defineProps<{
  headline?: string
  subheadline?: string
  columns?: 2 | 3
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  accentColor?: string
  items?: Array<{ quote: string; authorName: string; authorRole: string; authorAvatar: string; rating: number }>
}>()

function stars(rating: number, accent: string) {
  return Array.from({ length: 5 }, (_, i) => ({ filled: i < Math.min(5, Math.max(1, rating)), color: accent }))
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor||'#f8fafc', padding: '72px 24px' }">
    <div :style="{ maxWidth:'1200px', margin:'0 auto' }">
      <div v-if="headline || subheadline" :style="{ textAlign:'center', marginBottom:'56px' }">
        <h2 v-if="headline" :style="{ color:textColor||'#1e293b', fontSize:'36px', fontWeight:800, margin:'0 0 16px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color:textColor||'#1e293b', opacity:0.7, fontSize:'18px', margin:0, lineHeight:1.65 }">{{ subheadline }}</p>
      </div>
      <div :style="{ display:'grid', gridTemplateColumns:`repeat(${columns||3},1fr)`, gap:'24px' }">
        <div
          v-for="(item, i) in (items||[])" :key="i"
          :style="{ backgroundColor:cardColor||'#ffffff', borderRadius:'16px', padding:'32px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', display:'flex', flexDirection:'column' }"
        >
          <div :style="{ display:'flex', gap:'2px', marginBottom:'16px' }">
            <span v-for="s in stars(item.rating, accentColor||'#f59e0b')" :key="s.color+Math.random()" :style="{ fontSize:'18px', color:s.filled ? (accentColor||'#f59e0b') : '#d1d5db' }">★</span>
          </div>
          <p :style="{ color:textColor||'#1e293b', fontSize:'16px', lineHeight:1.7, margin:'0 0 24px', flexGrow:1, fontStyle:'italic' }">"{{ item.quote }}"</p>
          <div :style="{ display:'flex', alignItems:'center', gap:'12px' }">
            <img v-if="item.authorAvatar" :src="item.authorAvatar" :alt="item.authorName" :style="{ width:'44px', height:'44px', borderRadius:'50%', objectFit:'cover', flexShrink:0 }" />
            <div v-else :style="{ width:'44px', height:'44px', borderRadius:'50%', backgroundColor:accentColor||'#f59e0b', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'18px', flexShrink:0 }">
              {{ item.authorName?.charAt(0) }}
            </div>
            <div>
              <p :style="{ color:textColor||'#1e293b', fontWeight:700, fontSize:'15px', margin:0 }">{{ item.authorName }}</p>
              <p :style="{ color:textColor||'#1e293b', opacity:0.6, fontSize:'13px', margin:0 }">{{ item.authorRole }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
