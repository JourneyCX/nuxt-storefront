<script setup lang="ts">
// Trade sign-in (B2B Session 4). The page only collects the email and password and posts them to /api/trade/login;
// Stratum checks them and the storefront sets a signed HttpOnly cookie. Merchant branding only (the layout's header).
useHead({ title: 'Trade sign in', meta: [{ name: 'robots', content: 'noindex' }] })

const route    = useRoute()
const email    = ref('')
const password = ref('')
const busy     = ref(false)
const error    = ref('')

const input = 'width:100%;padding:12px;border:1px solid #cbd5e0;border-radius:6px;font-size:15px;box-sizing:border-box'
const label = 'display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px'

// Only ever a path on this site (never an address elsewhere).
const next = computed(() => {
  const n = String(route.query.next ?? '')
  return /^\/(?!\/)[A-Za-z0-9\-_/.?=&%]*$/.test(n) ? n : '/'
})

async function submit() {
  error.value = ''
  if (!email.value.trim() || !password.value) { error.value = 'Enter your email and password.'; return }
  busy.value = true
  try {
    await $fetch('/api/trade/login', { method: 'POST', body: { email: email.value.trim(), password: password.value } })
    // A full page load, so the server renders the next page with the new session.
    window.location.assign(next.value)
  } catch (e: any) {
    const status = e?.statusCode ?? e?.response?.status
    error.value = status === 429
      ? 'Too many attempts. Please wait a while and try again.'
      : status === 503
        ? 'Sign-in is not available right now. Please try again shortly.'
        : 'The email or password is not right.'
    password.value = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div style="max-width:420px;margin:48px auto;padding:0 16px">
    <h1 style="font-size:26px;margin:0 0 8px">Trade sign in</h1>
    <p style="color:#718096;margin:0 0 24px">Sign in to see your trade prices and range.</p>

    <form @submit.prevent="submit" novalidate>
      <p v-if="error" role="alert" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px;font-size:14px;margin:0 0 16px">{{ error }}</p>
      <div style="margin-bottom:16px">
        <label for="trade-email" :style="label">Email</label>
        <input id="trade-email" v-model="email" type="email" autocomplete="username" :style="input" />
      </div>
      <div style="margin-bottom:20px">
        <label for="trade-password" :style="label">Password</label>
        <input id="trade-password" v-model="password" type="password" autocomplete="current-password" :style="input" />
      </div>
      <button type="submit" :disabled="busy"
        style="width:100%;background:#2b6cb0;color:#fff;padding:14px;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <p style="margin:20px 0 4px;font-size:14px"><NuxtLink to="/trade/forgot">Forgot your password?</NuxtLink></p>
    <p style="margin:0;font-size:14px;color:#4a5568">No trade account yet? <NuxtLink to="/trade/apply">Apply for a trade account</NuxtLink></p>
  </div>
</template>
