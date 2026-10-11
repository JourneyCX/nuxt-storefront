<script setup lang="ts">
// Set or reset a trade password from an emailed link (B2B Session 4): /trade/set-password?c={contact}&k={key}.
// The key is single use (invite 48 h, reset 1 h) and checked by Stratum; this page only asks Stratum whether the link
// is still good, then posts the new password with it.
useHead({ title: 'Choose your trade password', meta: [{ name: 'robots', content: 'noindex' }, { name: 'referrer', content: 'no-referrer' }] })

const route  = useRoute()
const c      = String(route.query.c ?? '')
const k      = String(route.query.k ?? '')
const state  = ref<'checking' | 'valid' | 'invalid' | 'done'>('checking')
const kind   = ref<string | null>(null)
const pw1    = ref('')
const pw2    = ref('')
const busy   = ref(false)
const error  = ref('')

const input = 'width:100%;padding:12px;border:1px solid #cbd5e0;border-radius:6px;font-size:15px;box-sizing:border-box'
const label = 'display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px'

onMounted(async () => {
  if (!/^\d+$/.test(c) || !/^[0-9a-f]{48}$/.test(k)) { state.value = 'invalid'; return }
  try {
    const r = await $fetch<{ valid: boolean; kind: string | null }>('/api/trade/password-check', { method: 'POST', body: { c, k } })
    kind.value = r.kind
    state.value = r.valid ? 'valid' : 'invalid'
  } catch {
    state.value = 'invalid'
  }
})

async function submit() {
  error.value = ''
  if (pw1.value.length < 10) { error.value = 'Use at least 10 characters.'; return }
  if (!/[A-Za-z]/.test(pw1.value) || !/[0-9]/.test(pw1.value)) { error.value = 'Use letters and at least one number.'; return }
  if (pw1.value !== pw2.value) { error.value = 'The two passwords do not match.'; return }
  busy.value = true
  try {
    await $fetch('/api/trade/set-password', { method: 'POST', body: { c, k, password: pw1.value } })
    state.value = 'done'
  } catch (e: any) {
    const msg = e?.statusMessage || e?.data?.statusMessage
    if ((e?.statusCode ?? e?.response?.status) === 422 && /no longer valid/i.test(String(msg))) state.value = 'invalid'
    else error.value = String(msg || 'We could not save the password. Please try again.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div style="max-width:420px;margin:48px auto;padding:0 16px">
    <h1 style="font-size:26px;margin:0 0 16px">Choose your password</h1>

    <p v-if="state === 'checking'" style="color:#718096">Checking your link…</p>

    <div v-else-if="state === 'invalid'" style="background:#fffaf0;border:1px solid #fbd38d;border-radius:8px;padding:18px">
      <p style="margin:0 0 8px;color:#744210;font-weight:600">This link has expired or was already used</p>
      <p style="margin:0;color:#975a16;font-size:14px">Links work once and expire. <NuxtLink to="/trade/forgot">Request a new link</NuxtLink> and we will email you another.</p>
    </div>

    <div v-else-if="state === 'done'" style="background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;padding:18px">
      <p style="margin:0 0 8px;color:#22543d;font-weight:600">Your password is set</p>
      <p style="margin:0;color:#2f855a;font-size:14px"><NuxtLink to="/trade/login">Sign in</NuxtLink> with your email and new password.</p>
    </div>

    <form v-else @submit.prevent="submit" novalidate>
      <p style="color:#718096;margin:0 0 20px">Use at least 10 characters, with letters and at least one number.</p>
      <p v-if="error" role="alert" style="background:#fff5f5;border:1px solid #fed7d7;color:#c53030;border-radius:6px;padding:10px 12px;font-size:14px;margin:0 0 16px">{{ error }}</p>
      <div style="margin-bottom:16px">
        <label for="pw1" :style="label">New password</label>
        <input id="pw1" v-model="pw1" type="password" autocomplete="new-password" :style="input" />
      </div>
      <div style="margin-bottom:20px">
        <label for="pw2" :style="label">Repeat the password</label>
        <input id="pw2" v-model="pw2" type="password" autocomplete="new-password" :style="input" />
      </div>
      <button type="submit" :disabled="busy"
        style="width:100%;background:#2b6cb0;color:#fff;padding:14px;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer">
        {{ busy ? 'Saving…' : 'Save password' }}
      </button>
    </form>
  </div>
</template>
