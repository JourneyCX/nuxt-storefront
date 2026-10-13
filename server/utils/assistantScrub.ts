// Shop Assistant secrets never leave this server (2026-10-13). The widget key (sai_ + 48 hex) used to ride along in the
// site settings and in the AI block's saved props, i.e. in every page's HTML payload and in /api responses, where anyone
// could copy it and spend the merchant's AI credits. The browser now talks to /api/shop-assistant (server/api), which
// signs the call itself, so any key-shaped string in an outgoing body is removed, and the platform's own endpoint
// address is replaced by the same-origin proxy path. Applies to EVERY tenant (retail and B2B alike).

const KEY_RE = /sai_[0-9a-f]{32,64}/gi

// Nuxt's page payload writes every "/" as the six characters  /  (a backslash, u, 0, 0, 2, F). Built from
// String.fromCharCode so the escape is never written out literally in this source.
const BS = String.fromCharCode(92)
const ESC = BS + BS + 'u002F' // as a regex fragment: matches the six characters
const SL = '(?:' + ESC + '|/)'
// https://shop.stratumengage.com/{slug}/ps/api/ai/storefront_chat, plain or in the escaped form
const ENDPOINT_RE = new RegExp('https?:' + SL + '{2}[a-z0-9.-]+(?:' + SL + '[a-z0-9_-]+)?' + SL + 'ps' + SL + 'api' + SL + 'ai' + SL + 'storefront_chat', 'gi')
const PROXY_PLAIN = '/api/shop-assistant'
const PROXY_ESCAPED = BS + 'u002F' + 'api' + BS + 'u002F' + 'shop-assistant'

export function scrubAssistantText(text: string): string {
  if (!text || (!text.includes('sai_') && !text.includes('storefront_chat'))) return text
  return text
    .replace(KEY_RE, '')
    .replace(ENDPOINT_RE, m => (m.includes(BS) ? PROXY_ESCAPED : PROXY_PLAIN))
}

export function scrubAssistantValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  let json: string
  try { json = JSON.stringify(value) } catch { return value }
  if (!json.includes('sai_') && !json.includes('storefront_chat')) return value
  try { return JSON.parse(scrubAssistantText(json)) as T } catch { return value }
}
