import type { H3Event } from 'h3'
import type { WcProduct, WcVariation, TradeInfo } from '~/server/utils/woocommerce'
import { tradeCall, tradeState, activeBuyer, type TradeBuyer } from '~/server/utils/tradeContext'

// B2B Session 4: put Stratum's trade prices, tiers, quantity rules and stock onto the WooCommerce products a page is
// about to show. The storefront NEVER computes a price: every figure below is Stratum's resolver output (Session 3),
// reached through the signed `quote_skus` call (one call per page of up to 48 products).
//
// Linking rule (Dana, 2026-10-11): Stratum's sync mapping first (the answer may carry wc_product_id), the product
// SKU as the fallback (the store sync pushes sku_code as the WooCommerce SKU). A product Stratum cannot match, or that
// is outside the buyer's catalog, is NOT shown to a trade buyer: never a retail or guessed price.

export interface TradeShapeResult<T> {
  items:     T[]
  hidden:    number     // outside the buyer's catalog or not sellable
  unmatched: string[]   // WooCommerce products Stratum could not match (skus / ids)
}

type Line = Record<string, any>

const NOTE_PENDING = 'Trade ordering is opening soon.'
const NOTE_WINDOW  = 'Buying is for trade accounts. Log in, or apply for a trade account.'

function money(v: unknown): string {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

/** What an anonymous visitor sees in Shop window mode (and nothing at all in any other mode). */
export function windowInfo(event: H3Event): TradeInfo | undefined {
  const t = tradeState(event)
  if (!t.enabled || t.active || t.mode !== 'shop_window') return undefined
  return { mode: 'window', priceHidden: t.windowPrice === 'hidden', retailLabel: t.windowPrice === 'retail', buyDisabled: true, buyNote: NOTE_WINDOW }
}

/** Shop window, anonymous: hide the price (or label it) and never offer a buy button. */
export function applyWindow<T extends WcProduct | WcVariation>(event: H3Event, item: T): T {
  const info = windowInfo(event)
  if (!info) return item
  const out: T = { ...item, trade: info }
  if (info.priceHidden) { out.price = ''; out.regular_price = ''; out.sale_price = ''; out.on_sale = false }
  return out
}

function tradeInfoFrom(line: Line, extra: Partial<TradeInfo> = {}, checkout = false): TradeInfo {
  const qr = line.quantity_rule
  return {
    mode: 'trade',
    buyDisabled: !checkout,           // Session 5a: a buy button for a trade buyer only where Stratum has trade ordering on
    buyNote: checkout ? undefined : NOTE_PENDING,
    vatNote: line.vat_applies ? 'excl. VAT' : undefined,
    tiers: Array.isArray(line.tiers) ? line.tiers.map((t: Line) => ({ min_qty: Number(t.min_qty), price_excl: money(t.price_excl) })) : [],
    quantityRule: qr && (qr.min || qr.max || (qr.increment && qr.increment > 1))
      ? { min: Number(qr.min ?? 1), max: qr.max == null ? null : Number(qr.max), increment: Number(qr.increment ?? 1) }
      : undefined,
    stock: line.stock ? { available: line.stock.available == null ? null : Number(line.stock.available), status: String(line.stock.status ?? '') } : undefined,
    itemId: line.item_id ? Number(line.item_id) : undefined,
    ...extra,
  }
}

// The buyer's allowed products as SKUs, remembered for 3 seconds (a page load asks several times). Null when the answer is
// not a complete list (more than 300 products, or Stratum could not answer): the caller then does not restrict the query.
const visibleMemo = new Map<string, { at: number; value: string[] | null }>()
export async function visibleSkus(event: H3Event, buyer: TradeBuyer): Promise<string[] | null> {
  const key = `${buyer.company_id}|${buyer.location_id ?? 0}`
  const hit = visibleMemo.get(key)
  if (hit && Date.now() - hit.at < 3000) return hit.value
  let value: string[] | null = null
  try {
    const res = await tradeCall<any>(event, 'visible_skus', { buyer: { company_id: buyer.company_id, location_id: buyer.location_id } })
    if (res.status === 200 && res.data?.success && res.data.complete) value = (res.data.skus as string[]) ?? []
  } catch { value = null }
  visibleMemo.set(key, { at: Date.now(), value })
  if (visibleMemo.size > 500) visibleMemo.clear()
  return value
}

/** One signed call per chunk of 48 SKUs. Throws 502 when Stratum cannot answer (a trade buyer never gets a retail price instead). */
async function quoteSkus(event: H3Event, buyer: TradeBuyer, skus: string[]): Promise<Record<string, Line>> {
  const out: Record<string, Line> = {}
  const uniq = [...new Set(skus.filter(Boolean))]
  for (let i = 0; i < uniq.length; i += 48) {
    const chunk = uniq.slice(i, i + 48)
    const res = await tradeCall<any>(event, 'quote_skus', {
      buyer: { company_id: buyer.company_id, location_id: buyer.location_id },
      items: chunk.map(sku => ({ sku, qty: 1 })),
    })
    if (res.status !== 200 || !res.data?.success) throw createError({ statusCode: 502, statusMessage: 'Trade prices are unavailable right now.' })
    Object.assign(out, res.data.items)
  }
  return out
}

function visible(q: Line | undefined): boolean {
  return !!q && q.found === true && q.in_catalog !== false && q.sellable !== false
}

/** A trade buyer's listing: price, hide and annotate. Anonymous / retail / non-trade: Shop window handling or untouched. */
export async function shapeProducts(event: H3Event, products: WcProduct[]): Promise<TradeShapeResult<WcProduct>> {
  const buyer = activeBuyer(event)
  if (!buyer) return { items: products.map(p => applyWindow(event, p)), hidden: 0, unmatched: [] }

  const quotes = await quoteSkus(event, buyer, products.map(p => String(p.sku ?? '')))
  const items: WcProduct[] = []
  const unmatched: string[] = []
  let hidden = 0
  for (const p of products) {
    const sku = String(p.sku ?? '')
    const q = sku ? quotes[sku] : undefined
    if (!q || q.found !== true) { unmatched.push(sku || `#${p.id}`); continue }
    if (!visible(q)) { hidden++; continue }
    const from = q.price_from ?? null
    const unit = from !== null && from !== undefined ? from : q.unit_price_excl
    const price = money(unit)
    items.push({
      ...p,
      price, regular_price: '', sale_price: '', on_sale: false,
      stock_status: q.stock?.status === 'out_of_stock' ? 'outofstock' : p.stock_status,
      trade: tradeInfoFrom(q, from !== null && from !== undefined ? { priceFrom: money(q.price_from), priceTo: money(q.price_to ?? q.price_from) } : {}, tradeState(event).checkout),
    })
  }
  return { items, hidden, unmatched }
}

/** One product page. Returns null when a trade buyer is not allowed to see it (the route answers 404). */
export async function shapeProduct(event: H3Event, p: WcProduct): Promise<WcProduct | null> {
  const r = await shapeProducts(event, [p])
  return r.items[0] ?? null
}

/** A variable product's variations for a trade buyer: Stratum's per-variant price, tiers, quantity rule and stock. */
export async function shapeVariations(event: H3Event, parentSku: string, variations: WcVariation[]): Promise<WcVariation[]> {
  const buyer = activeBuyer(event)
  if (!buyer) return variations.map(v => applyWindow(event, v))
  if (!parentSku) return []
  const q = (await quoteSkus(event, buyer, [parentSku]))[parentSku]
  if (!q || q.found !== true || !visible(q)) return []
  const bySku = new Map<string, Line>()
  for (const v of (q.variants ?? []) as Line[]) bySku.set(String(v.sku), v)
  const out: WcVariation[] = []
  for (const v of variations) {
    const line = bySku.get(String(v.sku ?? ''))
    if (!line || line.in_catalog === false || line.sellable === false) continue // unmatched or hidden: never a guessed price
    const price = money(line.unit_price_excl)
    out.push({
      ...v,
      price, regular_price: '', sale_price: '', on_sale: false,
      stock_status: line.stock?.status === 'out_of_stock' ? 'outofstock' : v.stock_status,
      trade: tradeInfoFrom(line, {}, tradeState(event).checkout),
    })
  }
  return out
}
