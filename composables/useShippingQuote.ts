import type { ShippingCheckoutRate } from '~/server/utils/stratum'

export interface ShippingQuoteAddress {
  address_1: string
  city:      string
  state:     string
  postcode:  string
  country:   string
}

// Shared, module-level state (same sharing pattern as useCart.ts's
// cart/cartOpen refs) -- lets the courier rate a shopper picks on /cart
// survive the client-side navigation to /checkout without re-querying Bob
// Go/The Courier Guy, and lets /checkout pre-fill the address fields already
// given on /cart instead of asking twice. A hard page refresh loses this (it
// is not persisted), which is deliberate: /checkout re-checks it on mount
// and bounces a shippable cart with no selection back to /cart to re-choose.
const quoteAddress = reactive<ShippingQuoteAddress>({
  address_1: '', city: '', state: '', postcode: '', country: 'ZA',
})
const selectedRate = ref<ShippingCheckoutRate | null>(null)

export function useShippingQuote() {
  function setQuoteAddress(address: Partial<ShippingQuoteAddress>) {
    Object.assign(quoteAddress, address)
  }
  function selectRate(rate: ShippingCheckoutRate | null) {
    selectedRate.value = rate
  }
  function clear() {
    selectedRate.value = null
  }

  return {
    quoteAddress,
    selectedRate: readonly(selectedRate),
    setQuoteAddress,
    selectRate,
    clear,
  }
}
