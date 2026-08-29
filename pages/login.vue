<script setup lang="ts">
const { account, loading, error, fetchAccount, login } = useAccount()

// Already logged in (e.g. followed a direct link while a session cookie is
// still valid) -- bounce straight to the account page instead of showing
// the form again.
onMounted(async () => {
  await fetchAccount()
  if (account.value) navigateTo('/account')
})

const email    = ref('')
const password = ref('')

async function onSubmit() {
  const ok = await login({ email: email.value, password: password.value })
  if (ok) navigateTo('/account')
}
</script>

<template>
  <div style="max-width:440px;margin:0 auto;padding:64px 24px">
    <nav style="font-size:13px;color:#718096;margin-bottom:32px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <span>Log In</span>
    </nav>

    <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 32px">Log In</h1>

    <form @submit.prevent="onSubmit">
      <div style="margin-bottom:16px">
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Email</label>
        <input v-model="email" type="email" required autocomplete="email" placeholder="jane@example.com"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>
      <div style="margin-bottom:24px">
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Password</label>
        <input v-model="password" type="password" required autocomplete="current-password" placeholder="••••••••"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>

      <p v-if="error" style="color:#e53e3e;font-size:13px;margin:0 0 16px">{{ error }}</p>

      <button type="submit" :disabled="loading"
        style="width:100%;background:#2b6cb0;color:#fff;padding:14px 32px;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer">
        {{ loading ? 'Logging In…' : 'Log In' }}
      </button>
    </form>

    <p style="font-size:14px;color:#718096;margin-top:24px;text-align:center">
      Don't have an account?
      <a href="/register" style="color:#3182ce;text-decoration:none;font-weight:600">Register</a>
    </p>
  </div>
</template>
