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

// Legacy form (B2B 5b): older page content points at https://{platform}/uploads/store_builder/tenant_N/... with NO
// "/{slug}/ps/" in the path (images that were uploaded before per-tenant URLs, and theme sample images). For a B2B tenant
// these go through /sb-uploads/_/ (the "_" marks "no tenant slug"; the route then reads the shared uploads folder).
let cached: { base: string; plain: RegExp; escaped: RegExp; legacy: RegExp; legacyEscaped: RegExp } | null = null
function regexes(): { plain: RegExp; escaped: RegExp; legacy: RegExp; legacyEscaped: RegExp } {
  const base = uploadsBase()
  if (!cached || cached.base !== base) {
    const plainBase = escapeRe(base)
    const escBase = escapeRe(base.split('/').join(SLASH_ESCAPED))
    const e = escapeRe(SLASH_ESCAPED)
    cached = {
      base,
      plain: new RegExp(`${plainBase}/([a-z0-9_-]+)/ps/uploads/`, 'gi'),
      escaped: new RegExp(`${escBase}${e}([a-z0-9_-]+)${e}ps${e}uploads${e}`, 'gi'),
      legacy: new RegExp(`${plainBase}/uploads/(?=(?:store_builder|store_blog)/)`, 'gi'),
      legacyEscaped: new RegExp(`${escBase}${e}uploads${e}(?=(?:store_builder|store_blog)${e})`, 'gi'),
    }
  }
  cached.plain.lastIndex = 0
  cached.escaped.lastIndex = 0
  cached.legacy.lastIndex = 0
  cached.legacyEscaped.lastIndex = 0
  return cached
}

/** Rewrite platform upload URLs inside a string (HTML or JSON text), in both the plain and the /-escaped form. */
export function rewriteUploadsText(text: string): string {
  if (!text || (!text.includes('/ps/uploads/') && !text.includes(`${SLASH_ESCAPED}ps${SLASH_ESCAPED}uploads`) && !text.includes('/uploads/store_') && !text.includes(`${SLASH_ESCAPED}uploads${SLASH_ESCAPED}store_`))) return text
  const r = regexes()
  return text
    .replace(r.plain, '/sb-uploads/$1/')
    .replace(r.escaped, `${SLASH_ESCAPED}sb-uploads${SLASH_ESCAPED}$1${SLASH_ESCAPED}`)
    .replace(r.legacy, '/sb-uploads/_/')
    .replace(r.legacyEscaped, `${SLASH_ESCAPED}sb-uploads${SLASH_ESCAPED}_${SLASH_ESCAPED}`)
}

/** Rewrite inside any JSON-able value (API responses). Returns the same object when nothing needed changing. */
export function rewriteUploadsValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  let json: string
  try { json = JSON.stringify(value) } catch { return value }
  if (!json.includes('/ps/uploads/') && !json.includes('/uploads/store_')) return value
  try { return JSON.parse(rewriteUploadsText(json)) as T } catch { return value }
}

/** Only these upload folders, only media files, never a path that can climb out of them. */
export function isAllowedUploadPath(slug: string, rest: string): boolean {
  if (!/^[a-z0-9_-]{1,64}$/i.test(slug)) return false
  if (!rest || rest.includes('%') || rest.includes('..') || rest.includes('\\') || rest.includes('//') || rest.includes('\0')) return false
  if (!/^(?:store_builder|store_blog|company)\//.test(rest)) return false // company/: the logo used in trade emails (B2B 5a)
  return /\.(?:png|jpe?g|gif|webp|avif|svg|ico|mp4|webm)$/i.test(rest)
}
