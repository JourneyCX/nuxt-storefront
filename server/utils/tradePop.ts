// A trade buyer's proof of payment (Session 6c). Pure decisions, kept apart from the routes so they can be tested on their own.
//
// The browser sends file names and the file contents as base64 and NOTHING else that matters: no amount, no status, no order id other
// than the reference in the URL. The platform decides what a file is from its CONTENT (PDF, JPEG, PNG), counts, sizes and who the buyer
// is; the checks here only stop an obviously bad request from travelling upstream.

export const POP_MAX_FILES = 3
export const POP_MAX_FILE_BYTES = 5 * 1024 * 1024

export interface PopFile { name: string; data: string }

export type PopBody = { ok: true; files: PopFile[] } | { ok: false; message: string }

/** A trade order reference as the storefront knows it. */
export function validOrderRef(ref: string): boolean {
  return /^B2B-\d{1,10}$/.test(ref)
}

/** base64 length of n bytes, with padding */
const encodedLength = (n: number): number => Math.ceil(n / 3) * 4

/** Shape-check the JSON the page sends. Keeps only `name` and `data` of each file; everything else the browser adds is dropped. */
export function parsePopBody(raw: string): PopBody {
  let body: unknown
  try { body = JSON.parse(raw) } catch { return { ok: false, message: 'The upload could not be read.' } }
  const list = (body as { files?: unknown } | null)?.files
  if (!Array.isArray(list) || list.length < 1 || list.length > POP_MAX_FILES) {
    return { ok: false, message: `Choose between 1 and ${POP_MAX_FILES} files.` }
  }
  const files: PopFile[] = []
  for (const f of list) {
    const name = typeof (f as PopFile)?.name === 'string' ? (f as PopFile).name.slice(0, 255) : ''
    const data = typeof (f as PopFile)?.data === 'string' ? (f as PopFile).data : ''
    if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { ok: false, message: 'A file could not be read.' }
    if (data.length > encodedLength(POP_MAX_FILE_BYTES)) return { ok: false, message: 'A file is larger than the 5 MB limit.' }
    files.push({ name: name || 'proof', data })
  }
  return { ok: true, files }
}

export interface PopReply { status: number; ok: boolean; message: string; accepted?: number; proofs?: unknown[] }

/** What the buyer is told for the platform's answer to an upload. The platform's own sentence is used when it gave one. */
export function decidePopReply(httpStatus: number, data: unknown): PopReply {
  const d = (data ?? null) as { success?: boolean; error?: string; message?: string; accepted?: number; proofs?: unknown[] } | null
  if (httpStatus === 200 && d?.success === true) {
    return { status: 200, ok: true, message: String(d.message || 'Thank you. We will check your proof of payment and confirm.'), accepted: Number(d.accepted ?? 0), proofs: Array.isArray(d.proofs) ? d.proofs : [] }
  }
  if (httpStatus === 401) return { status: 401, ok: false, message: 'Please sign in to your trade account.' }
  if (httpStatus === 404) return { status: 404, ok: false, message: 'We could not find that order.' }
  if (httpStatus === 429) return { status: 429, ok: false, message: String(d?.error || 'Too many uploads. Please try again later.') }
  if (httpStatus === 409 || httpStatus === 413 || httpStatus === 422) return { status: httpStatus, ok: false, message: String(d?.error || 'The upload was not accepted.') }
  return { status: 502, ok: false, message: 'The upload could not be completed right now. Please try again in a few minutes.' }
}
