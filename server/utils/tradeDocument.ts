// A trade buyer's statement and credit-note links (Session 8e). Pure decisions, kept apart from the routes so they can be tested on their own.
//
// The links in the statement and credit-note mails are /trade/statement/{token} and /trade/credit-note/{token} on the merchant's own
// storefront. The token is random and stands for one contact and one period (statement) or one credit note; the route asks the platform over a
// signed call (`statement_get` / `credit_note_get`) and streams the PDF under the merchant's own domain, made from today's figures. Nothing is
// served unless the platform returns something that really is a PDF. A wrong, expired, foreign or no-longer-allowed token is the same page as
// an unknown one, so a token cannot be probed.
import { safeFilename } from './taxInvoice.ts'

export type DocumentKind = 'statement' | 'credit_note'

export type DocumentReply =
  | { kind: 'pdf'; filename: string; bytes: Buffer }
  | { kind: 'page'; code: number; title: string; message: string; retryAfter?: number }

const WORDS: Record<DocumentKind, { noun: string; fallback: string }> = {
  statement: { noun: 'statement', fallback: 'statement.pdf' },
  credit_note: { noun: 'credit note', fallback: 'credit-note.pdf' },
}

/** The platform call behind each kind of link. */
export const DOCUMENT_CALLS: Record<DocumentKind, string> = { statement: 'statement_get', credit_note: 'credit_note_get' }

export function decideDocumentReply(kind: DocumentKind, httpStatus: number, data: unknown): DocumentReply {
  const w = WORDS[kind]
  const Noun = w.noun.charAt(0).toUpperCase() + w.noun.slice(1)
  if (httpStatus === 429) {
    return { kind: 'page', code: 429, title: 'Please try again shortly', message: 'Too many requests. Please try again in a minute.', retryAfter: 60 }
  }
  const d = (data ?? null) as { success?: boolean; code?: string; filename?: string; pdf_base64?: string } | null
  if (httpStatus === 200 && d && d.success === true && typeof d.pdf_base64 === 'string' && d.pdf_base64.length > 0) {
    const bytes = Buffer.from(d.pdf_base64, 'base64')
    // a real PDF starts with %PDF-: never serve anything else under an application/pdf label
    if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') {
      return { kind: 'pdf', filename: safeFilename(String(d.filename ?? '')).replace(/^tax-invoice\.pdf$/, w.fallback), bytes }
    }
    return { kind: 'page', code: 502, title: `${Noun} unavailable`, message: `Your ${w.noun} could not be loaded right now. Please try again in a few minutes.` }
  }
  if (httpStatus === 410 && d && d.code === 'SUPERSEDED') {
    return { kind: 'page', code: 410, title: `This ${w.noun} was cancelled`, message: `This ${w.noun} was cancelled. Please contact us if you need a copy.` }
  }
  if (httpStatus === 404) {
    return { kind: 'page', code: 404, title: 'This link is not valid any more', message: `We could not find that ${w.noun}. The link may have expired; please contact us for a new copy.` }
  }
  return { kind: 'page', code: 502, title: `${Noun} unavailable`, message: `Your ${w.noun} could not be loaded right now. Please try again in a few minutes.` }
}
