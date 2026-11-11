// Paying invoices by bank transfer with proof (Session 8d): the pure decisions, kept apart from the routes and the page so they can be tested on
// their own. The browser never sends an amount that counts: the back office's staff type every amount when they record the payment. The only
// figure a buyer can give is "the amount I paid", kept for the merchant to compare with the bank statement.

export const PAY_MAX_INVOICES = 50
export const AMOUNT_HINT = 'for example 1250.00 or R 1,250.00'

export const PAY_STATUS_LABELS: Record<string, string> = {
  requested: 'Waiting for your proof of payment',
  pending: 'Waiting for us to check your proof',
  partly: 'Being recorded',
  confirmed: 'Recorded',
  declined: 'Declined',
  closed: 'Partly recorded',
}

/** A payment id as the back office makes it (a 26 character ULID). */
export function validPaymentId(id: unknown): id is string {
  return typeof id === 'string' && /^[0-9A-Za-z]{26}$/.test(id)
}

/**
 * The amount a buyer typed, as plain "1250.50", or null when it cannot be read with certainty. "1250", "1250.5", "R 1250", "R1,250.00" and
 * "1 250.00" are fine; "1,25" (a decimal comma?), "12.345" and anything with other characters are not. The same rule the back office applies.
 */
export function normaliseAmount(text: unknown): string | null {
  if (typeof text !== 'string') return null
  let t = text.replace(/[\s ]/g, '').replace(/^[Rr]/, '')
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(t)) t = t.replace(/,/g, '')
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(t)) return null
  const [whole, frac = ''] = t.split('.')
  return `${whole}.${frac.padEnd(2, '0')}`
}

export type StartBody = { ok: true; body: { all: true } | { invoice_ids: number[] } } | { ok: false; message: string }

/** Which invoices the buyer wants to pay: every open one, or a list of CI3 invoice ids. Anything else the browser adds is dropped. */
export function parseStartBody(raw: unknown): StartBody {
  const b = (raw ?? null) as { all?: unknown; invoice_ids?: unknown } | null
  if (b && b.all === true && b.invoice_ids === undefined) return { ok: true, body: { all: true } }
  const ids = b?.invoice_ids
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > PAY_MAX_INVOICES) {
    return { ok: false, message: `Choose between 1 and ${PAY_MAX_INVOICES} invoices to pay.` }
  }
  if (!ids.every(i => Number.isInteger(i) && i > 0 && i <= 2_000_000_000)) return { ok: false, message: 'Choose the invoices you want to pay.' }
  return { ok: true, body: { invoice_ids: [...new Set(ids as number[])] } }
}

export interface PayReply { status: number; ok: boolean; message: string; code?: string }

/** What the buyer is told for the back office's answer. Its own sentence is used for a refusal the buyer can act on. */
export function decidePayReply(httpStatus: number, data: unknown): PayReply {
  const d = (data ?? null) as { success?: boolean; error?: string; code?: string; message?: string } | null
  if (httpStatus === 200 && d?.success === true) return { status: 200, ok: true, message: String(d.message || '') }
  if (httpStatus === 401) return { status: 401, ok: false, message: 'Please sign in to your trade account.', code: 'NOT_SIGNED_IN' }
  if (httpStatus === 403) return { status: 403, ok: false, message: String(d?.error || 'Your login does not include the account area.'), code: 'NO_ACCOUNT_ACCESS' }
  if (httpStatus === 404) return { status: 404, ok: false, message: 'We could not find that payment.', code: 'NOT_FOUND' }
  if (httpStatus === 409 || httpStatus === 413 || httpStatus === 422 || httpStatus === 429) {
    return { status: httpStatus, ok: false, message: String(d?.error || 'That was not accepted.'), code: d?.code ? String(d.code) : undefined }
  }
  return { status: 503, ok: false, message: 'This cannot be done right now. Please try again in a few minutes.', code: 'UNAVAILABLE' }
}

export type BuyerFields = { ok: true; reference: string; total: string } | { ok: false; message: string }

/**
 * The two optional things a buyer may add to an upload: the reference they used for the transfer (for the merchant to match it) and the amount
 * they paid (for the merchant to compare). Neither is ever an amount that counts. The amount is read the way people write money and passed on
 * as plain "1250.00"; anything else the browser adds is dropped.
 */
export function parseBuyerFields(body: unknown): BuyerFields {
  const b = (body ?? {}) as { buyer_reference?: unknown; buyer_total?: unknown }
  const reference = typeof b.buyer_reference === 'string' ? b.buyer_reference.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, 100) : ''
  let total = ''
  if (typeof b.buyer_total === 'string' && b.buyer_total.trim() !== '') {
    const n = normaliseAmount(b.buyer_total.slice(0, 40))
    if (n === null) return { ok: false, message: `Enter the amount you paid in rand and cents, ${AMOUNT_HINT}, or leave it blank.` }
    total = n
  }
  return { ok: true, reference, total }
}
