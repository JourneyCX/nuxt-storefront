<script setup lang="ts">
// "Forgot password" for trade buyers (B2B Session 4). The answer is the same whether or not the address belongs to a
// trade account, so nobody can use this page to find out who has one.
useHead({ title: 'Reset your trade password', meta: [{ name: 'robots', content: 'noindex' }] })

// A store without B2B has no trade pages at all (same answer as any unknown address).
const { me: tradeMe } = await useTrade()
if (!tradeMe.value.enabled) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const email = ref('')
const busy  = ref(false)
const sent  = ref(false)
const error = ref('')

const input = 'width:100%;padding:12px;border:1px solid #cbd5e0;border-radius:6px;font-size:15px;box-sizing:border-box'
const label = 'display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px'

async function submit() {
  error.value = ''
  if (!email.value.trim()) { error.value = 'Enter your email address.'; return }
  busy.value = true
  try {
    await $fetch('/api/trade/forgot', { method: 'POST', body: { email: email.value.trim() } })
    sent.value = true
  } catch {
    error.value = 'We could not send that right now. Please try again shortly.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div style="max-width:420px;margin:48px auto;padding:0 16px">
    <h1 style="font-size:26px;margin:0 0 8px">Reset your password</h1>

    <div v-if="sent" style="background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;padding:18px;margin-top:16px">
      <p style="margin:0 0 8px;color:#22543d;font-weight:600">Check your email</p>
      <p style="margin:0;color:#2f855a;font-size:14px">If that address belongs to a trade account, we have sent a link to choose a new password. The link works once and expires in one hour.</p>
    </div>

    <form v-else @submit.prevent="submit" novalidate>
      <p style="color:#718096;margin:0 0 24px">Enter the email address you use for your trade account.</p>
      <p v-if="error" role="alert" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px;font-size:14px;margin:0 0 16px">{{ error }}</p>
      <div style="margin-bottom:20px">
        <label for="forgot-email" :style="label">Email</label>
        <input id="forgot-email" v-model="email" type="email" autocomplete="username" :style="input" />
      </div>
      <button type="submit" :disabled="busy"
        style="width:100%;background:#2b6cb0;color:#fff;padding:14px;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer">
        {{ busy ? 'Sending…' : 'Send me a link' }}
      </button>
    </form>

    <p style="margin:20px 0 0;font-size:14px"><NuxtLink to="/trade/login">Back to sign in</NuxtLink></p>
  </div>
</template>
