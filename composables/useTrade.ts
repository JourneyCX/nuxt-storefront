// B2B Session 4: what the storefront needs to know about the visitor's trade state, for the header indicator and the
// price / buy-button blocks. The answer comes from /api/trade/me, which reflects a LIVE check with Stratum made by
// server/middleware/trade.ts for that same request (company on hold, contact deactivated ... take effect at once).
// A retail tenant (B2B off) gets { enabled: false } and nothing in the UI changes.

export interface TradeMe {
  enabled:      boolean
  mode?:        'open' | 'shop_window' | 'hybrid' | 'closed'
  windowPrice?: 'hidden' | 'retail'
  signedIn?:    boolean
  onHold?:      boolean
  checkout?:    boolean   // Session 5a: this buyer can order (cart and checkout are open)
  company?:     string | null
  name?:        string | null
}

export async function useTrade() {
  const requestFetch = useRequestFetch()
  const route = useRoute()
  const { data, refresh } = await useAsyncData<TradeMe>(
    'trade-me',
    () => requestFetch<TradeMe>('/api/trade/me').catch(() => ({ enabled: false } as TradeMe)),
    { server: true },
  )
  const me = computed<TradeMe>(() => data.value ?? { enabled: false })

  // Client-side navigation does not reload the page: ask again so a hold or sign-out shows up on the next click.
  if (import.meta.client) watch(() => route.fullPath, () => { refresh() })

  async function signOut() {
    try { await $fetch('/api/trade/logout', { method: 'POST', body: {} }) } catch { /* the cookie is cleared server-side either way */ }
    window.location.assign('/')
  }

  return { me, signOut }
}
