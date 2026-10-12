// B2B Session 5a: the trade cart as the trade pages use it. Everything shown comes from Stratum's answer (/api/trade/cart);
// this file only asks, sends the buyer's changes, and formats. A price, total or VAT figure is never computed here.

export interface TradeCartAnswer { status: number; data: any }

export function useTradeCart() {
  const view  = ref<any>(null)
  const busy  = ref(false)
  const notice = ref('')        // plain-words result of the last change ("Minimum order for X is 6.")
  const loadError = ref('')

  function symbol(): string {
    return String(view.value?.currency_symbol || (view.value?.currency === 'ZAR' ? 'R' : view.value?.currency || ''))
  }
  function money(v: string | number | null | undefined): string {
    const n = Number(v)
    return `${symbol()} ${Number.isFinite(n) ? n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, ' ') : '0.00'}`
  }

  async function load(remember = false) {
    loadError.value = ''
    const res = await $fetch.raw<any>(`/api/trade/cart${remember ? '?remember=1' : ''}`, { ignoreResponseError: true })
    if (res.status === 200 && res._data?.success) { view.value = res._data; return true }
    loadError.value = String(res._data?.statusMessage || res._data?.message || 'Your cart could not be loaded.')
    return false
  }

  /** One change. Returns Stratum's answer; on success the cart is replaced by the new one; on a refusal the notice says why. */
  async function act(body: Record<string, unknown>): Promise<TradeCartAnswer> {
    busy.value = true
    notice.value = ''
    try {
      const res = await $fetch.raw<any>('/api/trade/cart', { method: 'POST', body, ignoreResponseError: true })
      const data = res._data
      if (res.status === 200 && data?.success) {
        if (data.lines) view.value = data
      } else {
        notice.value = String(data?.error || data?.statusMessage || 'That did not work. Please try again.')
        if (data?.cart?.lines) view.value = data.cart
      }
      return { status: res.status, data }
    } finally {
      busy.value = false
    }
  }

  return { view, busy, notice, loadError, load, act, money, symbol }
}
