<script setup lang="ts">
type SocialPost = { platform: string; content: string; imageUrl: string; likes: number; url: string }
defineProps<{
  headline?: string
  columns?: 2 | 3 | 4
  backgroundColor?: string
  textColor?: string
  accentColor?: string
  posts?: SocialPost[]
}>()
</script>
<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div style="max-width:1200px;margin:0 auto;">
      <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '32px', fontWeight: 800, margin: '0 0 36px' }">{{ headline }}</h2>
      <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${columns || 3}, 1fr)`, gap: '20px' }">
        <a v-for="(post, i) in (posts?.length ? posts : Array.from({length:columns||3}, (_,i) => ({platform:'Instagram',content:'Share your story with the world. ✨ #lifestyle #brand',imageUrl:'',likes:42,url:'#'})))" :key="i"
          :href="post.url || '#'" target="_blank" rel="noopener"
          style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;text-decoration:none;display:block;">
          <div style="aspect-ratio:1/1;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img v-if="post.imageUrl" :src="post.imageUrl" alt="" style="width:100%;height:100%;object-fit:cover;" />
            <span v-else style="font-size:32px;opacity:0.4;">📸</span>
          </div>
          <div style="padding:14px;">
            <p :style="{ color: textColor || '#1e293b', fontSize: '13px', margin: '0 0 8px', lineHeight: 1.5, opacity: 0.85 }">{{ post.content }}</p>
            <div style="display:flex;align-items:center;gap:6px;">
              <span :style="{ fontSize: '12px', color: accentColor || '#2563eb', fontWeight: 700 }">{{ post.platform }}</span>
              <span style="font-size:12px;color:#94a3b8;">· ♥ {{ post.likes }}</span>
            </div>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
