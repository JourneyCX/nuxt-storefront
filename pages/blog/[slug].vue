<script setup lang="ts">
import type { BlogPost } from '~/server/utils/stratum'

const route = useRoute()
const slug  = route.params.slug as string

// Server-side relative $fetch does not carry the original request's Host
// header, so the tenant-resolution middleware (server/middleware/tenant.ts)
// can't identify the store on this internal call and the post silently
// 404s for every tenant. useRequestFetch() forwards the incoming request's
// headers to internal SSR fetches; plain $fetch does not. Same fix already
// applied to pages/product/[slug].vue.
const requestFetch = useRequestFetch()

const { data: post, error } = await useAsyncData<BlogPost>(
  `blog-post-${slug}`,
  () => requestFetch(`/api/blog/${slug}`),
  { server: true }
)

if (error.value || !post.value) {
  throw createError({ statusCode: 404, statusMessage: `Post "${slug}" not found.` })
}

useHead({
  title: post.value.seo.title,
  meta: [
    { name: 'description', content: post.value.seo.meta_description },
    ...(post.value.seo.og_image ? [{ property: 'og:image', content: post.value.seo.og_image }] : []),
  ],
})

const formattedDate = computed(() => {
  if (!post.value?.published_at) return null
  return new Date(post.value.published_at.replace(' ', 'T')).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})
</script>

<template>
  <div style="max-width:840px;margin:0 auto;padding:48px 24px">
    <!-- Breadcrumb -->
    <nav style="font-size:13px;color:#718096;margin-bottom:32px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <a href="/blog" style="color:#3182ce;text-decoration:none">Blog</a>
      <span style="margin:0 8px">›</span>
      <span>{{ post!.title }}</span>
    </nav>

    <span
      v-if="post!.categories.length"
      style="display:inline-block;background-color:#2563eb18;color:#2563eb;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px"
    >
      {{ post!.categories[0].name }}
    </span>

    <h1 style="margin:0 0 16px;font-size:32px;font-weight:800;color:#1a202c;line-height:1.25">
      {{ post!.title }}
    </h1>

    <div style="display:flex;gap:14px;flex-wrap:wrap;color:#718096;font-size:13px;margin-bottom:32px">
      <span v-if="formattedDate">{{ formattedDate }}</span>
      <span v-if="post!.author">{{ post!.author }}</span>
    </div>

    <div v-if="post!.featured_image" style="border-radius:12px;overflow:hidden;background:#f7f8fa;margin-bottom:32px">
      <img :src="post!.featured_image" :alt="post!.title" style="width:100%;height:auto;display:block" />
    </div>

    <div
      style="font-size:16px;color:#2d3748;line-height:1.75"
      v-html="post!.body"
    />

    <nav style="margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0">
      <a href="/blog" style="color:#3182ce;text-decoration:none;font-size:14px;font-weight:600">← Back to Blog</a>
    </nav>
  </div>
</template>
