import type { H3Event } from 'h3'
import { tradeCall, tradeState, readTradeSid } from '~/server/utils/tradeContext'
import { createWcClient, type WcCart, type WcCartItem } from '~/server/utils/woocommerce'
import { fetchWooCredentials } from '~/server/utils/stratum'

// B2B Session 5a: the trade cart lives in Stratum, never in WooCommerce (D1). This file is the storefront's only way to
// reach it: signed `b2b_public/cart_*` / `order_*` calls carrying the trade session id from the buyer's HttpOnly cookie.
// Stratum re-derives the contact, the company and its status on every call, prices every line itself and refuses what the
// rules refuse; nothing the browser sends is a price, a company or a location. Retail shoppers never reach any of this.

/** A signed-in trade buyer of a tenant with trade ordering on: their cart is Stratum's trade cart. */
export function tradeCartOn(event: H3Event): boolean {
  const t = tradeState(event)
  return t.enabled && t.active && t.checkout
}

export interface TradeCartAnswer {
  status: number
  data:   any
}

/** One signed call with the buyer's session id added. Throws 401 when there is no session cookie. */
export async function cartCall(event: H3Event, action: string, body: Record<string, unknown> = {}): Promise<TradeCartAnswer> {
  const tenantId = event.context.tenantId as number
  const sid = readTradeSid(event, tenantId)
  if (!sid) throw createError({ statusCode: 401, statusMessage: 'Please sign in to your trade account.' })
  const res = await tradeCall<any>(event, action, { ...body, sid })
  return { status: res.status, data: res.data }
}

/** Like cartCall, but anything other than success becomes an error whose statusMessage is Stratum's plain-words reason. */
export async function cartOrThrow(event: H3Event, action: string, body: Record<string, unknown> = {}): Promise<any> {
  const r = await cartCall(event, action, body)
  if (r.status === 200 && r.data?.success) return r.data
  const message = String(r.data?.error || 'Something went wrong with your cart. Please try again.')
  throw createError({ statusCode: r.status >= 400 && r.status < 600 ? r.status : 502, statusMessage: message })
}

const SYMBOLS: Record<string, string> = { ZAR: 'R', USD: '$', EUR: '€', GBP: '£' }

function minor(decimal: string | number | null | undefined): string {
  const n = Number(decimal)
  return Number.isFinite(n) ? String(Math.round(n * 100)) : '0'
}

/** WooCommerce product images by id (parent product), best effort. The cart still works without them. */
export async function productImages(event: H3Event, ids: number[], skus: string[] = []): Promise<Map<string, { src: string; alt: string }>> {
  // keyed by "id:{wc id}" and "sku:{sku}" so a line with no mapped WooCommerce id still finds its picture by SKU
  const out = new Map<string, { src: string; alt: string }>()
  const uniq = [...new Set(ids.filter(n => Number.isFinite(n) && n > 0))]
  const uSkus = [...new Set(skus.map(s => String(s || '').trim()).filter(Boolean))]
  if (!uniq.length && !uSkus.length) return out
  try {
    const config = useRuntimeConfig()
    const creds = await fetchWooCredentials(config.stratumInternalUrl, event.context.tenantId as number)
    if (!creds) return out
    const wc = createWcClient(creds.url, creds.key, creds.secret)
    const products = [
      ...(uniq.length ? await wc.getProducts({ include: uniq }) : []),
      ...(uSkus.length ? await wc.getProducts({ sku: uSkus.slice(0, 100) }) : []),
    ]
    for (const p of products) {
      if (!p.images?.[0]) continue
      const img = { src: p.images[0].src, alt: p.images[0].alt || p.name }
      out.set(`id:${p.id}`, img)
      if (p.sku) out.set(`sku:${p.sku}`, img)
    }
  } catch { /* images are decoration */ }
  return out
}

/**
 * The SKU Stratum should join a WooCommerce product to when it has no link row: what the page sent (a chosen variation's
 * SKU), else the product's own SKU from WooCommerce. A lookup key only: Stratum prices and checks the item itself.
 */
export async function skuForAdd(event: H3Event, productId: number, sent?: unknown): Promise<string> {
  const s = typeof sent === 'string' ? sent.slice(0, 100) : ''
  if (s) return s
  const config = useRuntimeConfig()
  const creds = await fetchWooCredentials(config.stratumInternalUrl, event.context.tenantId as number)
  if (!creds) return ''
  const p = await createWcClient(creds.url, creds.key, creds.secret).getProduct(Number(productId)).catch(() => null)

  return String(p?.sku ?? '')
}

/** The picture for one trade-cart line: by its WooCommerce id when Stratum has one, else by SKU. */
export function lineImage(images: Map<string, { src: string; alt: string }>, l: any): { src: string; alt: string } | null {
  return images.get(`id:${Number(l.wc_product_id ?? 0)}`) ?? images.get(`sku:${String(l.sku ?? '')}`) ?? null
}

/**
 * The trade cart in the shape the existing mini-cart (CartDrawer, header count, product page) already renders, so retail
 * and trade share those components. Prices are per unit EXCLUDING VAT, as Stratum worked them out. The whole trade view
 * rides along as `trade` for the trade pages.
 */
export async function toWcCart(event: H3Event, view: any): Promise<WcCart & { trade: any }> {
  const symbol = String(view.currency_symbol || SYMBOLS[view.currency] || view.currency || '')
  const lines = (view.lines ?? []) as any[]
  const images = await productImages(event, lines.map(l => Number(l.wc_product_id ?? 0)), lines.map(l => String(l.sku ?? '')))
  const items: WcCartItem[] = lines.map((l) => {
    const img = lineImage(images, l)
    return {
      key: String(l.line_id),
      id: Number(l.wc_variation_id ?? l.wc_product_id ?? l.item_id),
      quantity: Number(l.pack_qty),
      name: String(l.name),
      prices: { price: minor(l.unit_excl ?? 0), currency_symbol: symbol, currency_minor_unit: 2 },
      images: img ? [img] : [],
    }
  })
  return {
    items,
    items_count: Number(view.items_count ?? items.reduce((n, i) => n + i.quantity, 0)),
    needs_shipping: false,
    has_calculated_shipping: false,
    shipping_address: {} as any,
    shipping_rates: [],
    coupons: [],
    payment_methods: [],
    totals: {
      total_price: minor(view.totals?.gross),
      total_shipping: null,
      total_discount: '0',
      currency_code: String(view.currency || 'ZAR'),
      currency_symbol: symbol,
      currency_minor_unit: 2,
    },
    trade: { vatApplies: !!view.vat_applies, subtotalExcl: view.totals?.goods_excl },
  }
}
