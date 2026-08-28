<script setup lang="ts">
defineProps<{
  headline?: string
  subheadline?: string
  columns?: 2 | 3 | 4
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  accentColor?: string
  members?: Array<{ photo: string; name: string; role: string; bio: string; linkedin: string; twitter: string }>
}>()
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor||'#ffffff', padding: '72px 24px' }">
    <div :style="{ maxWidth:'1200px', margin:'0 auto' }">
      <div v-if="headline || subheadline" :style="{ textAlign:'center', marginBottom:'56px' }">
        <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color:textColor||'#1e293b', fontWeight:800, margin:'0 0 16px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color:textColor||'#1e293b', opacity:0.7, fontSize:'18px', margin:0, lineHeight:1.65 }">{{ subheadline }}</p>
      </div>
      <!-- sb-grid collapses this to 1 column on mobile / 2 on tablet regardless of the merchant's chosen column count -->
      <div class="sb-grid" :style="{ display:'grid', gridTemplateColumns:`repeat(${columns||3},1fr)`, gap:'28px' }">
        <div v-for="(member, i) in (members||[])" :key="i"
          :style="{ backgroundColor:cardColor||'#f8fafc', borderRadius:'16px', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }"
        >
          <img v-if="member.photo" :src="member.photo" :alt="member.name" :style="{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }" />
          <div v-else :style="{ width:'100%', aspectRatio:'4/3', backgroundColor:`${accentColor||'#2563eb'}22`, display:'flex', alignItems:'center', justifyContent:'center' }">
            <span :style="{ fontSize:'56px', color:accentColor||'#2563eb', fontWeight:700 }">{{ member.name?.charAt(0) }}</span>
          </div>
          <div :style="{ padding:'24px 28px' }">
            <h3 :style="{ color:textColor||'#1e293b', fontSize:'20px', fontWeight:700, margin:'0 0 4px' }">{{ member.name }}</h3>
            <p :style="{ color:accentColor||'#2563eb', fontSize:'14px', fontWeight:600, margin:'0 0 14px', textTransform:'uppercase', letterSpacing:'0.05em' }">{{ member.role }}</p>
            <p v-if="member.bio" :style="{ color:textColor||'#1e293b', opacity:0.7, fontSize:'14px', lineHeight:1.65, margin:'0 0 18px' }">{{ member.bio }}</p>
            <div v-if="member.linkedin || member.twitter" :style="{ display:'flex', gap:'12px' }">
              <a v-if="member.linkedin" :href="member.linkedin" target="_blank" rel="noopener noreferrer" :style="{ color:accentColor||'#2563eb', textDecoration:'none', fontSize:'13px', fontWeight:600 }">LinkedIn ↗</a>
              <a v-if="member.twitter" :href="member.twitter" target="_blank" rel="noopener noreferrer" :style="{ color:accentColor||'#2563eb', textDecoration:'none', fontSize:'13px', fontWeight:600 }">Twitter ↗</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
