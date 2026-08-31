export default defineNuxtConfig({
  devtools: { enabled: false },

  css: ['~/assets/css/responsive.css'],

  runtimeConfig: {
    // Server-only — never exposed to the browser
    stratumInternalUrl: process.env.STRATUM_INTERNAL_URL || 'http://localhost:8080',
    // HMAC secret for signing the customer-account session cookie
    // (server/utils/accountSession.ts). Must be set to a real random value
    // in .env before deploy -- accountSession.ts fails closed (500) if empty,
    // deliberately, rather than falling back to a guessable default.
    accountSessionSecret: process.env.ACCOUNT_SESSION_SECRET || '',
    // Supplier Network checkout-time stock reservation API (Laravel) — a
    // static shared secret, not per-tenant, since the Laravel endpoint
    // identifies the tenant from the request body (tenant slug), not from a
    // credential. Same "fails closed if unset" posture as accountSessionSecret
    // above — see server/utils/supplierNetwork.ts.
    supplierNetworkCheckoutUrl: process.env.SUPPLIER_NETWORK_CHECKOUT_URL || '',
    supplierNetworkCheckoutSecret: process.env.SUPPLIER_NETWORK_CHECKOUT_SECRET || '',
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
