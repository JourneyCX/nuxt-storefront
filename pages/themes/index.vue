<script setup lang="ts">
// Public, unauthenticated theme gallery — the Shopify-themes.com-style
// "browse before you buy" page. No admin login involved anywhere in this
// path: fetchPublishedThemes() hits Store_builder_api::published_themes(),
// a bare CI_Controller like theme_css()/preview_page(), and every card here
// links straight to /preview/{slug} (see pages/preview/[theme].vue), which is
// itself unauthenticated too. This page is reachable from ANY tenant domain
// this app serves, but is meant to be linked to from the Demo tenant's own
// domain (get_option('store_theme_manager_demo_domain') on the CI3 side) —
// see theme_preview.php's own "View Demo" link for the sibling admin-side
// entry point this page is the public counterpart of.
import { fetchPublishedThemes, type PublishedThemeSummary } from '~/server/utils/stratum'

// Own minimal chrome, not the tenant's real site header/footer — same
// reasoning as pages/preview/[theme].vue: this page's purpose (browsing
// THEMES) has nothing to do with whichever real tenant's domain happens to
// be serving it, and mixing in that tenant's own branding would be confusing
// here specifically, unlike a normal storefront page.
definePageMeta({ layout: false })

const config = useRuntimeConfig()

const { data: themes } = await useAsyncData<PublishedThemeSummary[]>(
  'published-themes',
  () => fetchPublishedThemes(config.stratumInternalUrl),
  { server: true }
)

const activeCategory = ref<string>('all')

const categories = computed(() => {
  const seen = new Map<string, string>()
  for (const t of themes.value ?? []) {
    if (!seen.has(t.category)) seen.set(t.category, t.categoryName)
  }
  return [{ slug: 'all', name: 'All themes' }, ...Array.from(seen, ([slug, name]) => ({ slug, name }))]
})

const visibleThemes = computed(() => {
  if (activeCategory.value === 'all') return themes.value ?? []
  return (themes.value ?? []).filter((t) => t.category === activeCategory.value)
})

useHead({
  title: 'Browse Themes',
  meta: [{ name: 'description', content: 'Preview available storefront themes before applying one to your store.' }],
})
</script>

<template>
  <div class="sb-themes">
    <header class="sb-themes__header">
      <h1>Browse Themes</h1>
      <p>Click any theme to see it live, click through pages, and get a real feel for it before applying it to your store.</p>
    </header>

    <nav v-if="categories.length > 1" class="sb-themes__filters">
      <button
        v-for="cat in categories"
        :key="cat.slug"
        class="sb-themes__filter"
        :class="{ 'sb-themes__filter--active': activeCategory === cat.slug }"
        @click="activeCategory = cat.slug"
      >
        {{ cat.name }}
      </button>
    </nav>

    <div v-if="visibleThemes.length" class="sb-themes__grid">
      <NuxtLink
        v-for="theme in visibleThemes"
        :key="theme.id"
        :to="`/preview/${theme.slug}`"
        class="sb-themes__card"
      >
        <div class="sb-themes__thumb">
          <img v-if="theme.previewImage" :src="theme.previewImage" :alt="theme.name" loading="lazy">
          <div v-else class="sb-themes__thumb-placeholder">{{ theme.name.charAt(0) }}</div>
        </div>
        <div class="sb-themes__body">
          <div class="sb-themes__title-row">
            <span class="sb-themes__title">{{ theme.name }}</span>
            <span class="sb-themes__badge">{{ theme.categoryName }}</span>
          </div>
          <p v-if="theme.description" class="sb-themes__desc">{{ theme.description }}</p>
        </div>
      </NuxtLink>
    </div>

    <p v-else class="sb-themes__empty">No themes are published yet — check back soon.</p>
  </div>
</template>

<style scoped>
.sb-themes {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 24px 80px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111827;
}
.sb-themes__header {
  text-align: center;
  margin-bottom: 32px;
}
.sb-themes__header h1 {
  font-size: 32px;
  margin: 0 0 8px;
}
.sb-themes__header p {
  color: #6b7280;
  font-size: 15px;
  margin: 0;
}
.sb-themes__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 32px;
}
.sb-themes__filter {
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
}
.sb-themes__filter--active {
  background: #111827;
  border-color: #111827;
  color: #fff;
}
.sb-themes__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}
.sb-themes__card {
  display: block;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  background: #fff;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.sb-themes__card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.sb-themes__thumb {
  aspect-ratio: 4 / 3;
  background: #f3f4f6;
  overflow: hidden;
}
.sb-themes__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sb-themes__thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 700;
  color: #9ca3af;
}
.sb-themes__body {
  padding: 14px 16px;
}
.sb-themes__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.sb-themes__title {
  font-weight: 600;
  font-size: 15px;
}
.sb-themes__badge {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.sb-themes__desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sb-themes__empty {
  text-align: center;
  color: #6b7280;
  padding: 60px 0;
}
</style>
