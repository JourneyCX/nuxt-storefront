<script setup lang="ts">
const { account, loading, error, fetchAccount, register } = useAccount()

onMounted(async () => {
  await fetchAccount()
  if (account.value) navigateTo('/account')
})

const form = reactive({
  first_name: '',
  last_name:  '',
  email:      '',
  password:   '',
})
const confirmPassword    = ref('')
const confirmError       = ref('')
// Unchecked by default -- opt-in, not opt-out.
const acceptsMarketing   = ref(false)

async function onSubmit() {
  confirmError.value = ''
  if (form.password.length < 8) {
    confirmError.value = 'Password must be at least 8 characters.'
    return
  }
  if (form.password !== confirmPassword.value) {
    confirmError.value = 'Passwords do not match.'
    return
  }
  const ok = await register({ ...form, accepts_marketing: acceptsMarketing.value })
  if (ok) navigateTo('/account')
}
</script>

<template>
  <div style="max-width:440px;margin:0 auto;padding:64px 24px">
    <nav style="font-size:13px;color:#718096;margin-bottom:32px">
      <a href="/" style="color:#3182ce;text-decoration:none">Home</a>
      <span style="margin:0 8px">›</span>
      <span>Register</span>
    </nav>

    <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 32px">Create an Account</h1>

    <form @submit.prevent="onSubmit">
      <div class="sb-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">First Name</label>
          <input v-model="form.first_name" type="text" required autocomplete="given-name" placeholder="Jane"
            style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Last Name</label>
          <input v-model="form.last_name" type="text" required autocomplete="family-name" placeholder="Smith"
            style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
        </div>
      </div>
      <div style="margin-bottom:16px">
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Email</label>
        <input v-model="form.email" type="email" required autocomplete="email" placeholder="jane@example.com"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>
      <div style="margin-bottom:16px">
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Password</label>
        <input v-model="form.password" type="password" required autocomplete="new-password" placeholder="At least 8 characters"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>
      <div style="margin-bottom:24px">
        <label style="display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px">Confirm Password</label>
        <input v-model="confirmPassword" type="password" required autocomplete="new-password" placeholder="••••••••"
          style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box" />
      </div>

      <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4a5568;margin-bottom:24px;cursor:pointer">
        <input v-model="acceptsMarketing" type="checkbox" />
        I'd like to receive marketing emails and offers
      </label>

      <p v-if="confirmError || error" style="color:#e53e3e;font-size:13px;margin:0 0 16px">{{ confirmError || error }}</p>

      <button type="submit" :disabled="loading"
        style="width:100%;background:#2b6cb0;color:#fff;padding:14px 32px;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer">
        {{ loading ? 'Creating Account…' : 'Create Account' }}
      </button>
    </form>

    <p style="font-size:14px;color:#718096;margin-top:24px;text-align:center">
      Already have an account?
      <a href="/login" style="color:#3182ce;text-decoration:none;font-weight:600">Log In</a>
    </p>
  </div>
</template>
