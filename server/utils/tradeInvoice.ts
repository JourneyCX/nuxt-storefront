// A trade buyer's invoice link (decision 3c). Pure decisions, kept apart from the route so they can be tested on their own.
//
// The link in the invoice mail is /trade/invoice/{token} on the merchant's own storefront. The token is random and stands for one
// invoice and one contact; the route asks the platform over a signed call (`invoice_get`) and streams the PDF under the merchant's own
// domain. Nothing is served unless the platform returns something that really is a PDF. A wrong, expired or foreign token is the same
// page as an unknown one, so a token cannot be probed.
import { safeFilename } from './taxInvoice.ts'

export type InvoiceReply =
  | { kind: 'pdf'; filename: string; bytes: Buffer }
  | { kind: 'page'; code: number; title: string; message: string; retryAfter?: number }

/** Tokens are the 24 random bytes the platform makes, base64url (32 characters); anything else never reaches the platform. */
export function validInvoiceToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token)
}

const unavailable: InvoiceReply = { kind: 'page', code: 502, title: 'Invoice unavailable', message: 'Your invoice could not be loaded right now. Please try again in a few minutes.' }

export function decideInvoiceReply(httpStatus: number, data: unknown): InvoiceReply {
  if (httpStatus === 429) {
    return { kind: 'page', code: 429, title: 'Please try again shortly', message: 'Too many requests. Please try again in a minute.', retryAfter: 60 }
  }
  const d = (data ?? null) as { success?: boolean; code?: string; filename?: string; pdf_base64?: string } | null
  if (httpStatus === 200 && d && d.success === true && typeof d.pdf_base64 === 'string' && d.pdf_base64.length > 0) {
    const bytes = Buffer.from(d.pdf_base64, 'base64')
    // a real PDF starts with %PDF-: never serve anything else under an application/pdf label
    if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') {
      return { kind: 'pdf', filename: safeFilename(String(d.filename ?? '')).replace(/^tax-invoice\.pdf$/, 'invoice.pdf'), bytes }
    }
    return unavailable
  }
  if (httpStatus === 410 && d && d.code === 'SUPERSEDED') {
    return { kind: 'page', code: 410, title: 'This invoice was cancelled', message: 'This invoice was cancelled and replaced by a credit note. Please contact us if you need a copy.' }
  }
  if (httpStatus === 404) {
    return { kind: 'page', code: 404, title: 'This link is not valid any more', message: 'We could not find that invoice. The link may have expired; please contact us for a new copy.' }
  }
  return unavailable
}
