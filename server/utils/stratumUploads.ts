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

let cachedRe: { base: string; re: RegExp } | null = null
function uploadsRegex(): RegExp {
  const base = uploadsBase()
  if (!cachedRe || cachedRe.base !== base) {
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    cachedRe = { base, re: new RegExp(`${esc}/([a-z0-9_-]+)/ps/uploads/`, 'gi') }
  }
  cachedRe.re.lastIndex = 0
  return cachedRe.re
}

/** Rewrite platform upload URLs inside a string (HTML or JSON text). */
export function rewriteUploadsText(text: string): string {
  if (!text || !text.includes('/ps/uploads/')) return text
  return text.replace(uploadsRegex(), '/sb-uploads/$1/')
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
