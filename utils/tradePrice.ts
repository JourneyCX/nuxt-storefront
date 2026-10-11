// B2B Session 4: one place that turns a (possibly trade-shaped) WooCommerce product into the price text a listing shows.
// Retail products (no `trade` info) give exactly the text the listings always showed. Figures come from the server
// (server/utils/tradePricing.ts, Stratum's resolver); nothing is calculated here.
import type { TradeInfo } from '~/server/utils/woocommerce'

interface PriceSource {
  price?: string
  sale_price?: string
  currency_symbol?: string
  trade?: TradeInfo
}

export function listingPrice(p: PriceSource, symbolOverride?: string): string {
  const t = p.trade
  if (t?.priceHidden) return 'Log in for trade prices'
  const sym = symbolOverride ?? p.currency_symbol ?? ''
  const fmt = (v: string) => `${sym} ${parseFloat(v || '0').toFixed(2)}`
  if (t?.mode === 'trade' && t.priceFrom && t.priceTo && t.priceFrom !== t.priceTo) {
    return `From ${fmt(t.priceFrom)}${t.vatNote ? ' ' + t.vatNote : ''}`
  }
  const base = fmt(p.sale_price ? p.sale_price : (p.price || '0'))
  if (t?.mode === 'trade') return t.vatNote ? `${base} ${t.vatNote}` : base
  if (t?.retailLabel) return `${base} (Retail price)`
  return base
}
