import { defineEventHandler, createError } from 'h3'
import { resolveTrade, TRADE_OFF, type TradeState } from '~/server/utils/tradeContext'

// B2B Session 4: storefront modes, enforced on the server for every request (hiding UI alone is not enough).
// Runs after server/middleware/tenant.ts (alphabetical), so event.context.tenantId is already set.
//
//   Retail tenant (B2B off): TRADE_OFF, no headers, no gates, nothing changes.
//   B2B tenant: every page and API response is `private, no-store` + `Vary: Cookie`, because what a visitor sees can
//   depend on the trade cookie; a price meant for one buyer must never be served to another or to an anonymous visitor.
//
//   open / hybrid   anonymous: retail, unchanged.            shop_window  anonymous: no buy button, no cart.
//   closed          anonymous: only the sign-in, application, password pages and the merchant's listed company-info pages.
//   signed in       all modes: trade prices; the cart and checkout are refused until the trade checkout exists (Session 5a)
//                   so a trade buyer can never pay a retail price by accident. Signing out makes them a normal shopper.

const STATIC_PREFIXES = ['/_nuxt/', '/__nuxt', '/_ipx/', '/wc-media/', '/wc-pay/', '/sb-uploads/', '/favicon', '/_payload']
// Data routes that carry the catalogue (blocked for an anonymous visitor of a closed portal).
const CATALOGUE_API = ['/api/products', '/api/categories', '/api/collections', '/api/category-product-template', '/api/gift-wrap', '/api/cart']
// Pages that show the catalogue or take an order.
const CATALOGUE_PAGES = ['/product', '/cart', '/checkout', '/account', '/login', '/register', '/collections', '/shop', '/search', '/order-confirmation']

function startsWithAny(path: string, list: string[]): boolean {
  return list.some(p => path === p.replace(/\/$/, '') || path.startsWith(p.endsWith('/') ? p : p + '/') || path.startsWith(p + '?'))
}

function deny(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, statusMessage: message, data: { code, message } })
}

export default defineEventHandler(async (event) => {
  const path   = (event.path ?? '').split('?')[0]
  const method = (event.node.req.method ?? 'GET').toUpperCase()
  const isApi  = path.startsWith('/api/')

  if (!event.context.tenantId) return
  if (STATIC_PREFIXES.some(p => path.startsWith(p))) return
  if (path === '/api/invalidate') return // Stratum -> storefront, server to server

  let state: TradeState = TRADE_OFF
  state = await resolveTrade(event) // throws 503 when the mode cannot be determined and nothing is remembered
  event.context.trade = state
  if (!state.enabled) return

  const res = event.node.res
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Cookie')
  if (state.mode === 'closed') res.setHeader('X-Robots-Tag', 'noindex, nofollow')

  const signedIn = state.active
  // Manual redirect: h3's sendRedirect did not take effect from this middleware on this runtime (the page rendered with
  // 200). Setting the status and Location on the Node response and ending it is what h3 itself checks (event.handled).
  const redirect = (to: string) => {
    res.statusCode = 302
    res.setHeader('Location', to)
    res.end()
  }
  const toLogin = () => redirect('/trade/login')

  // ---- cart and checkout ------------------------------------------------------------------------------------------
  // Session 5a: with trade ordering on for this tenant, a signed-in buyer's cart is Stratum's trade cart (the /api/cart/*
  // handlers answer from it and never touch WooCommerce); the retail-only operations (coupons, shipping rates, the
  // WooCommerce checkout) are refused for them. With it off, the Session 4 block stands.
  if (path.startsWith('/api/cart')) {
    if (signedIn && state.checkout) {
      const tradeOk = path === '/api/cart' || path === '/api/cart/items' || path.startsWith('/api/cart/items/') || path === '/api/cart/clear'
      if (!tradeOk) deny(409, 'TRADE_USE_TRADE_CHECKOUT', 'Please use the trade checkout.')
    } else if (signedIn && method !== 'GET' && path !== '/api/cart/clear') {
      deny(409, 'TRADE_CHECKOUT_PENDING', 'Trade ordering is opening soon. Please contact us to place a trade order, or sign out to buy at retail prices.')
    }
    if (!signedIn && state.mode === 'closed') deny(403, 'TRADE_LOGIN_REQUIRED', 'Please sign in to your trade account.')
    if (!signedIn && state.mode === 'shop_window' && method !== 'GET') deny(403, 'TRADE_LOGIN_REQUIRED', 'Buying is for trade accounts. Please sign in.')
  }
  if (!isApi && !signedIn && state.mode === 'shop_window' && (path === '/cart' || path === '/checkout')) return toLogin()
  if (!isApi && signedIn && state.checkout && (path === '/cart' || path === '/checkout')) return redirect(path === '/cart' ? '/trade/cart' : '/trade/checkout')
  if (!isApi && signedIn && (path === '/checkout')) return redirect('/cart')
  // The trade cart and checkout pages are for a signed-in buyer of a tenant with trade ordering on (anyone else: the sign-in page).
  if (!isApi && (path === '/trade/cart' || path === '/trade/checkout' || path.startsWith('/trade/order/')) && !(signedIn && state.checkout)) return toLogin()
  // The account area (Session 8c) is for any signed-in trade contact; whether this contact may see balances is decided by the back office.
  if (!isApi && (path === '/trade/account' || path.startsWith('/trade/account/')) && !signedIn) return toLogin()

  // ---- closed portal: an anonymous visitor sees almost nothing -----------------------------------------------------
  if (state.mode === 'closed' && !signedIn) {
    if (isApi) {
      if (startsWithAny(path, CATALOGUE_API)) deny(401, 'TRADE_LOGIN_REQUIRED', 'Please sign in to your trade account.')
      return
    }
    if (path === '/robots.txt' || startsWithAny(path, ['/trade'])) return
    if (path === '/' || startsWithAny(path, CATALOGUE_PAGES)) return toLogin()
    // Any other page: only the company-info pages the merchant lists. Everything else goes to the sign-in page.
    const slug = path.replace(/^\/+|\/+$/g, '').toLowerCase()
    if (!state.publicPages.includes(slug)) return toLogin()
  }
})
