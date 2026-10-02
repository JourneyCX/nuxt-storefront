// Returns the current theme-preview identifier (if any) and a ready-to-
// append query-string suffix, so any storefront block that links to a real
// product/blog post keeps preview context flowing when clicked from WITHIN
// a preview session.
//
// Two distinct preview entry points exist and neither carries the other's
// signal automatically:
// - The dedicated /preview/{theme}/{page} route (pages/preview/[theme]/
//   [[page]].vue) has no ?previewTheme= query param of its own -- the
//   identifier lives in the route's own :theme param instead.
// - /product/[slug] and /blog/[slug] read ?previewTheme= directly (reached
//   via ThemePreviewBar's own Product/Blog Post pill).
//
// Without this, a ProductGrid/ProductCard/CollectionList/etc. block
// rendered INSIDE a previewed page's own Puck content had no way to know it
// was being previewed at all -- clicking through to a real product silently
// dropped back to the tenant's own live, unrelated product page instead of
// staying in preview. Confirmed live 2026-09-23 against Dazzle (Complete)'s
// "Crafted Ellegance" collection page: its ProductGrid's "View Product"
// links had no previewTheme awareness, landing on tenant 80's own real
// (Bracelets-filtered) product page instead of a preview-aware one.
export function usePreviewThemeQuery() {
  const route = useRoute()

  const previewTheme = computed<string | null>(() => {
    if (route.query.previewTheme) return route.query.previewTheme as string
    if (route.params.theme) return route.params.theme as string
    return null
  })

  const suffix = computed(() => (previewTheme.value ? `?previewTheme=${encodeURIComponent(previewTheme.value)}` : ''))

  return { previewTheme, suffix }
}
