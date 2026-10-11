<script setup lang="ts">
// Storefront error page (B2B Session 4, white-label). Replaces Nuxt's default "Server Error" page, which named the
// framework. Deliberately plain and brand-neutral: it never says which software runs the store, never shows a stack or
// an internal message, and it renders without the layout so it still works when the store itself could not be resolved.
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string } }>()

const notFound = computed(() => props.error?.statusCode === 404)
const title = computed(() => notFound.value ? 'Page not found' : 'Something went wrong')
useHead({ title, meta: [{ name: 'robots', content: 'noindex' }] })

function goHome() { clearError({ redirect: '/' }) }
</script>

<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#1a202c">
    <div style="max-width:460px;text-align:center">
      <p style="margin:0 0 8px;font-size:48px;font-weight:700;color:#cbd5e0">{{ notFound ? '404' : 'Oops' }}</p>
      <h1 style="margin:0 0 12px;font-size:24px">{{ title }}</h1>
      <p style="margin:0 0 28px;color:#718096;line-height:1.6">
        {{ notFound ? 'The page you are looking for does not exist or is no longer available.' : 'Please try again in a moment.' }}
      </p>
      <button type="button" @click="goHome" style="background:#1a202c;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer">Go to the home page</button>
    </div>
  </div>
</template>
