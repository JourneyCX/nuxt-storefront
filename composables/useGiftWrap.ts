import type { GiftWrapConfig } from '~/server/utils/stratum'

// Gift wrapping add-on config for the product page, fetched once per request
// (shared key) and reused by every product-detail component on the page.
export async function useGiftWrap() {
  const requestFetch = useRequestFetch()
  const { data } = await useAsyncData<GiftWrapConfig | null>(
    'gift-wrap-config',
    () => requestFetch<GiftWrapConfig>('/api/gift-wrap').catch(() => null),
    { default: () => null }
  )
  const giftWrapChecked = ref(false)
  const { addToCart } = useCart()

  // Called after the product itself is in the cart: one gift wrap per unit.
  async function addGiftWrap(quantity: number) {
    if (!giftWrapChecked.value || !data.value?.enabled) return
    await addToCart(data.value.productId, quantity)
  }

  return { giftWrapConfig: data, giftWrapChecked, addGiftWrap }
}
