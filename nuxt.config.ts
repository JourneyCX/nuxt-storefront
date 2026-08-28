export default defineNuxtConfig({
  devtools: { enabled: false },

  css: ['~/assets/css/responsive.css'],

  runtimeConfig: {
    // Server-only — never exposed to the browser
    stratumInternalUrl: process.env.STRATUM_INTERNAL_URL || 'http://localhost:8080',
  },

  routeRules: {
    // SSR for all storefront pages
    '/**': { ssr: true },
    // API routes — no page cache
    '/api/**': { cache: false },
  },

  nitro: {
    routeRules: {
      // Storefront pages: stale-while-revalidate 60s
      '/**':      { isr: 60 },
      // Product detail pages: slightly longer cache
      '/product/**': { isr: 120 },
      // API routes: no cache
      '/api/**':  { cache: false },
    },
  },

  typescript: { strict: true },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // Montserrat — used for the header nav menu links (SiteHeader.vue).
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&display=swap' },
      ],
    },
  },
})
