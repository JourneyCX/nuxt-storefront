<script setup lang="ts">
type Post = { title: string; excerpt: string; imageUrl: string; date: string; category: string; url: string; author?: string }

// NOTE: Vue casts an *absent* Boolean-typed prop to `false`, not `undefined` — a plain
// `v-if="showAuthor"` or `v-if="showCategory"` would silently hide these for
// any page that simply doesn't have the field stored. withDefaults() sets the real
// default (matching studio-app's BlogPostList.tsx defaultProps) before that cast happens.
const props = withDefaults(defineProps<{
  headline?: string
  subheadline?: string
  columns?: 2 | 3
  // layout/showAuthor/showDate/showCategory/showExcerpt/readMoreText/cardColor/borderRadius
  // were already implemented in studio-app's BlogPostList.tsx but never ported here —
  // restored for parity. ctaText/ctaUrl/postCount are new additive fields (see
  // BlogPostList.tsx for the same schema-drift note).
  layout?: 'grid' | 'list' | 'featured'
  showAuthor?: boolean
  showDate?: boolean
  showCategory?: boolean
  showExcerpt?: boolean
  readMoreText?: string
  ctaText?: string
  ctaUrl?: string
  postCount?: number
  backgroundColor?: string
  textColor?: string
  accentColor?: string
  cardColor?: string
  borderRadius?: number
  posts?: Post[]
}>(), {
  showAuthor: true,
  showDate: true,
  showCategory: true,
  showExcerpt: true,
})

const FALLBACK_POSTS: Post[] = Array.from({ length: 3 }, (_, i) => ({
  title: `Post Title ${i + 1}`,
  excerpt: 'A short excerpt from this blog post goes here.',
  imageUrl: '',
  date: 'June 2025',
  category: 'News',
  author: 'The Team',
  url: '#',
}))

const displayPosts = computed(() => {
  const base = props.posts?.length ? props.posts : FALLBACK_POSTS
  return typeof props.postCount === 'number' ? base.slice(0, props.postCount) : base
})

const isList = computed(() => props.layout === 'list')
const isFeatured = computed(() => props.layout === 'featured')
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div style="max-width:1200px;margin:0 auto;">
      <div v-if="headline || subheadline || ctaText" style="margin-bottom:40px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div>
          <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '32px', fontWeight: 800, margin: '0 0 12px' }">{{ headline }}</h2>
          <p v-if="subheadline" :style="{ color: textColor || '#1e293b', opacity: 0.65, fontSize: '17px', margin: 0 }">{{ subheadline }}</p>
        </div>
        <a v-if="ctaText" :href="ctaUrl || '#'" :style="{ color: accentColor || '#2563eb', fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }">{{ ctaText }} →</a>
      </div>

      <div
        v-if="isFeatured && displayPosts.length > 0"
        :style="{ display: 'grid', gridTemplateColumns: displayPosts.length > 1 ? '1.6fr 1fr' : '1fr', gap: '24px' }"
      >
        <article :style="{ backgroundColor: cardColor || '#fff', borderRadius: `${borderRadius ?? 12}px`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }">
          <div style="aspect-ratio:16/9;position:relative;">
            <img v-if="displayPosts[0].imageUrl" :src="displayPosts[0].imageUrl" :alt="displayPosts[0].title" style="width:100%;height:100%;object-fit:cover;display:block;" />
            <div v-else style="width:100%;height:100%;background:#bfdbfe;display:flex;align-items:center;justify-content:center;font-size:28px;opacity:0.6;">📝</div>
          </div>
          <div style="padding:20px 22px 24px;">
            <span v-if="showCategory && displayPosts[0].category" :style="{ display:'inline-block', backgroundColor: (accentColor||'#2563eb')+'18', color: accentColor||'#2563eb', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'10px' }">{{ displayPosts[0].category }}</span>
            <h3 :style="{ color: textColor || '#1e293b', fontSize:'20px', fontWeight:700, margin:'0 0 10px', lineHeight:1.35 }">
              <a :href="displayPosts[0].url" style="color:inherit;text-decoration:none;">{{ displayPosts[0].title }}</a>
            </h3>
            <p v-if="showExcerpt && displayPosts[0].excerpt" :style="{ color: textColor||'#1e293b', opacity:0.65, fontSize:'14px', lineHeight:1.65, margin:'0 0 16px' }">{{ displayPosts[0].excerpt }}</p>
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;gap:14px;flex-wrap:wrap;">
                <span v-if="showDate && displayPosts[0].date" :style="{ color: textColor||'#1e293b', opacity:0.5, fontSize:'12px' }">{{ displayPosts[0].date }}</span>
                <span v-if="showAuthor && displayPosts[0].author" :style="{ color: textColor||'#1e293b', opacity:0.5, fontSize:'12px' }">{{ displayPosts[0].author }}</span>
              </div>
              <a v-if="readMoreText" :href="displayPosts[0].url" :style="{ color: accentColor||'#2563eb', fontSize:'13px', fontWeight:700, textDecoration:'none' }">{{ readMoreText }} →</a>
            </div>
          </div>
        </article>
        <div v-if="displayPosts.length > 1" style="display:flex;flex-direction:column;gap:16px;">
          <article v-for="(post, i) in displayPosts.slice(1, 4)" :key="i" :style="{ backgroundColor: cardColor || '#fff', borderRadius: `${borderRadius ?? 12}px`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', border: '1px solid #f1f5f9' }">
            <div style="width:200px;flex-shrink:0;">
              <img v-if="post.imageUrl" :src="post.imageUrl" :alt="post.title" style="width:100%;height:100%;object-fit:cover;display:block;" />
              <div v-else style="width:100%;height:100%;background:#fde68a;display:flex;align-items:center;justify-content:center;font-size:28px;opacity:0.6;">📝</div>
            </div>
            <div style="padding:20px 24px;">
              <h3 :style="{ color: textColor || '#1e293b', fontSize:'20px', fontWeight:700, margin:'0 0 10px', lineHeight:1.35 }">
                <a :href="post.url" style="color:inherit;text-decoration:none;">{{ post.title }}</a>
              </h3>
              <a v-if="readMoreText" :href="post.url" :style="{ color: accentColor||'#2563eb', fontSize:'13px', fontWeight:700, textDecoration:'none' }">{{ readMoreText }} →</a>
            </div>
          </article>
        </div>
      </div>

      <div
        v-else
        :style="isList
          ? { display: 'flex', flexDirection: 'column', gap: '20px' }
          : { display: 'grid', gridTemplateColumns: `repeat(${columns || 3}, 1fr)`, gap: '20px' }"
      >
        <article v-for="(post, i) in displayPosts" :key="i"
          :style="{ backgroundColor: cardColor || '#fff', borderRadius: `${borderRadius ?? 12}px`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: isList ? 'flex' : 'block', border: '1px solid #f1f5f9' }">
          <div :style="isList ? { width: '200px', flexShrink: 0 } : { aspectRatio: '16/9', position: 'relative' }">
            <img v-if="post.imageUrl" :src="post.imageUrl" :alt="post.title" style="width:100%;height:100%;object-fit:cover;display:block;" />
            <div v-else style="width:100%;height:100%;background:#bbf7d0;display:flex;align-items:center;justify-content:center;font-size:28px;opacity:0.6;">📝</div>
          </div>
          <div :style="{ padding: isList ? '20px 24px' : '20px 22px 24px' }">
            <span v-if="showCategory && post.category" :style="{ display:'inline-block', backgroundColor: (accentColor||'#2563eb')+'18', color: accentColor||'#2563eb', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'10px' }">{{ post.category }}</span>
            <h3 :style="{ color: textColor || '#1e293b', fontSize: isList ? '20px' : '18px', fontWeight:700, margin:'0 0 10px', lineHeight:1.35 }">
              <a :href="post.url" style="color:inherit;text-decoration:none;">{{ post.title }}</a>
            </h3>
            <p v-if="showExcerpt && post.excerpt" :style="{ color: textColor||'#1e293b', opacity:0.65, fontSize:'14px', lineHeight:1.65, margin:'0 0 16px' }">{{ post.excerpt }}</p>
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;gap:14px;flex-wrap:wrap;">
                <span v-if="showDate && post.date" :style="{ color: textColor||'#1e293b', opacity:0.5, fontSize:'12px' }">{{ post.date }}</span>
                <span v-if="showAuthor && post.author" :style="{ color: textColor||'#1e293b', opacity:0.5, fontSize:'12px' }">{{ post.author }}</span>
              </div>
              <a v-if="readMoreText" :href="post.url" :style="{ color: accentColor||'#2563eb', fontSize:'13px', fontWeight:700, textDecoration:'none' }">{{ readMoreText }} →</a>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
