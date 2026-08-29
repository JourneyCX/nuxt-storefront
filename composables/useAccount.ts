import type { WcAddress } from '~/server/utils/woocommerce'

export interface AccountProfile {
  id:         number
  email:      string
  first_name: string
  last_name:  string
  billing:    WcAddress | null
  shipping:   WcAddress | null
}

// Same module-level singleton pattern as useCart.ts -- safe for the same
// reason: fetchAccount() is only ever invoked from onMounted (client-only),
// so there's no cross-request/cross-tenant SSR state leak.
const account = ref<AccountProfile | null>(null)
const loading = ref(false)
const error   = ref('')

export function useAccount() {
  async function fetchAccount() {
    loading.value = true
    try {
      account.value = await $fetch<AccountProfile>('/api/account/me')
    } catch {
      // Not logged in (401) or a transient error -- either way, "no account"
      // is the correct rendered state, not a hard error. Matches useCart's
      // fetchCart() catch-and-clear convention.
      account.value = null
    } finally {
      loading.value = false
    }
  }

  async function register(input: { email: string; password: string; first_name: string; last_name: string }) {
    loading.value = true
    error.value   = ''
    try {
      account.value = await $fetch<AccountProfile>('/api/account/register', { method: 'POST', body: input })
      return true
    } catch (err: unknown) {
      const e = err as { data?: { statusMessage?: string }; statusMessage?: string }
      error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Could not create account.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(input: { email: string; password: string }) {
    loading.value = true
    error.value   = ''
    try {
      account.value = await $fetch<AccountProfile>('/api/account/login', { method: 'POST', body: input })
      return true
    } catch (err: unknown) {
      const e = err as { data?: { statusMessage?: string }; statusMessage?: string }
      error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Invalid email or password.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await $fetch('/api/account/logout', { method: 'POST' }).catch(() => {})
    account.value = null
  }

  async function saveAddress(input: { billing?: WcAddress; shipping?: WcAddress }) {
    loading.value = true
    error.value   = ''
    try {
      const result = await $fetch<{ billing: WcAddress | null; shipping: WcAddress | null }>('/api/account/address', {
        method: 'POST',
        body:   input,
      })
      if (account.value) {
        account.value = { ...account.value, billing: result.billing, shipping: result.shipping }
      }
      return true
    } catch (err: unknown) {
      const e = err as { data?: { statusMessage?: string }; statusMessage?: string }
      error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Could not save address.'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    account: readonly(account),
    loading: readonly(loading),
    error:   readonly(error),
    fetchAccount,
    register,
    login,
    logout,
    saveAddress,
  }
}
