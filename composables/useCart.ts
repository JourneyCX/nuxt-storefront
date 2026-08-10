import type { WcCart } from '~/server/utils/woocommerce'

// Global cart state — one instance shared across the whole storefront.
const cart       = ref<WcCart | null>(null)
const cartOpen   = ref(false)
const cartLoading = ref(false)

export function useCart() {
  const itemCount = computed(() => cart.value?.items_count ?? 0)

  async function fetchCart() {
    cartLoading.value = true
    try {
      cart.value = await $fetch<WcCart>('/api/cart')
    } catch {
      // Cart errors are non-fatal; show empty cart
      cart.value = null
    } finally {
      cartLoading.value = false
    }
  }

  async function addToCart(productId: number, quantity = 1) {
    cartLoading.value = true
    try {
      cart.value = await $fetch<WcCart>('/api/cart/items', {
        method: 'POST',
        body:   { productId, quantity },
      })
      cartOpen.value = true
    } finally {
      cartLoading.value = false
    }
  }

  async function removeFromCart(key: string) {
    cartLoading.value = true
    try {
      cart.value = await $fetch<WcCart>(`/api/cart/items/${key}`, { method: 'DELETE' })
    } finally {
      cartLoading.value = false
    }
  }

  async function updateQuantity(key: string, quantity: number) {
    if (quantity < 1) return removeFromCart(key)
    cartLoading.value = true
    try {
      cart.value = await $fetch<WcCart>(`/api/cart/items/${key}`, { method: 'PUT', body: { quantity } })
    } finally {
      cartLoading.value = false
    }
  }

  const couponLoading = ref(false)
  const couponError   = ref('')

  async function applyCoupon(code: string) {
    couponLoading.value = true
    couponError.value   = ''
    try {
      cart.value = await $fetch<WcCart>('/api/cart/coupon', { method: 'POST', body: { code } })
      return true
    } catch (err: unknown) {
      // Confirmed live: Nitro's error response crossing the real browser->
      // server HTTP boundary only reliably carries statusMessage (nested
      // under ofetch's err.data, which is the raw parsed error body) --
      // .data.message is Nitro's own generic wrapper text ("Server Error"),
      // not the real WooCommerce reason. See coupon.post.ts.
      const e = err as { data?: { statusMessage?: string; message?: string }; statusMessage?: string }
      couponError.value = e?.data?.statusMessage ?? e?.statusMessage ?? e?.data?.message ?? 'Invalid or expired coupon code.'
      return false
    } finally {
      couponLoading.value = false
    }
  }

  async function removeCoupon(code: string) {
    couponLoading.value = true
    try {
      cart.value = await $fetch<WcCart>('/api/cart/coupon', { method: 'DELETE', body: { code } })
    } finally {
      couponLoading.value = false
    }
  }

  function openCart()  { cartOpen.value = true  }
  function closeCart() { cartOpen.value = false }

  return {
    cart:         readonly(cart),
    cartOpen:     readonly(cartOpen),
    cartLoading:  readonly(cartLoading),
    couponLoading: readonly(couponLoading),
    couponError:   readonly(couponError),
    itemCount,
    fetchCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    applyCoupon,
    removeCoupon,
    openCart,
    closeCart,
  }
}
