// B2B Session 4 (white-label): images the merchant uploads in Store Builder (logo, favicon, page images, blog images)
// are stored by Stratum and their URLs point at the platform's own address:
//   https://shop.stratumengage.com/{slug}/ps/uploads/store_builder/tenant_69/img_x.webp
// That puts the platform domain into every trade-facing page's source. For a B2B tenant these URLs are rewritten to the
// merchant's own domain, /sb-uploads/{slug}/store_builder/tenant_69/img_x.webp, and server/routes/sb-uploads serves them
// (fetching from the platform address server-side). Retail tenants are left exactly as before.

export const UPLOADS_BASE_DEFAULT = 'https://shop.stratumengage.com'

export function uploadsBase(): string {
  const cfg = (useRuntimeConfig() as any).stratumUploadsBase as string | undefined
  return (cfg || UPLOADS_BASE_DEFAULT).replace(/\/+$/, '')
}

const SLASH_ESCAPED = '\\u002F' // the 6 characters  /  that Nuxt's page payload writes in place of every "/"

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let cached: { base: string; plain: RegExp; escaped: RegExp } | null = null
function regexes(): { plain: RegExp; escaped: RegExp } {
  const base = uploadsBase()
  if (!cached || cached.base !== base) {
    const plainBase = escapeRe(base)
    const escBase = escapeRe(base.split('/').join(SLASH_ESCAPED))
    const e = escapeRe(SLASH_ESCAPED)
    cached = {
      base,
      plain: new RegExp(`${plainBase}/([a-z0-9_-]+)/ps/uploads/`, 'gi'),
      escaped: new RegExp(`${escBase}${e}([a-z0-9_-]+)${e}ps${e}uploads${e}`, 'gi'),
    }
  }
  cached.plain.lastIndex = 0
  cached.escaped.lastIndex = 0
  return cached
}

/** Rewrite platform upload URLs inside a string (HTML or JSON text), in both the plain and the /-escaped form. */
export function rewriteUploadsText(text: string): string {
  if (!text || (!text.includes('/ps/uploads/') && !text.includes(`${SLASH_ESCAPED}ps${SLASH_ESCAPED}uploads`))) return text
  const r = regexes()
  return text
    .replace(r.plain, '/sb-uploads/$1/')
    .replace(r.escaped, `${SLASH_ESCAPED}sb-uploads${SLASH_ESCAPED}$1${SLASH_ESCAPED}`)
}

/** Rewrite inside any JSON-able value (API responses). Returns the same object when nothing needed changing. */
export function rewriteUploadsValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  let json: string
  try { json = JSON.stringify(value) } catch { return value }
  if (!json.includes('/ps/uploads/')) return value
  try { return JSON.parse(rewriteUploadsText(json)) as T } catch { return value }
}

/** Only these upload folders, only media files, never a path that can climb out of them. */
export function isAllowedUploadPath(slug: string, rest: string): boolean {
  if (!/^[a-z0-9_-]{1,64}$/i.test(slug)) return false
  if (!rest || rest.includes('%') || rest.includes('..') || rest.includes('\\') || rest.includes('//') || rest.includes('\0')) return false
  if (!/^(?:store_builder|store_blog)\//.test(rest)) return false
  return /\.(?:png|jpe?g|gif|webp|avif|svg|ico|mp4|webm)$/i.test(rest)
}
