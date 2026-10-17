// The shopper's "tax invoice" link (VAT-2). Pure decisions, kept apart from the route so they can be tested on their own.
//
// The link is /tax-invoice/{wcOrderId}/{orderKey} on the merchant's own storefront (the stratum-headless plugin puts it in the
// order email, only for a VAT vendor). The route proves the shopper owns the order (the order key, checked against WooCommerce
// exactly as /api/orders/{id} does), then asks Stratum for the PDF over a signed call. Nothing is served unless Stratum says the
// invoice is a tax invoice that is ready; the wording of the two waiting/none pages is PROVISIONAL (CI3 docs/audit/vat-2.md P8).

export type StratumTaxInvoice =
  | { status: 'ready'; filename: string; pdf_base64: string }
  | { status: 'preparing' }
  | { status: 'none' }

export type TaxInvoiceReply =
  | { kind: 'pdf'; filename: string; bytes: Buffer }
  | { kind: 'page'; code: number; title: string; message: string; retryAfter?: number }

/** Order ids are plain positive integers; keys are WooCommerce's `wc_order_...` tokens. Anything else never reaches WooCommerce. */
export function validTaxInvoiceParams(orderId: string, key: string): boolean {
  return /^[1-9][0-9]{0,11}$/.test(orderId) && /^[A-Za-z0-9_]{8,64}$/.test(key)
}

/** A file name safe for a Content-Disposition header. */
export function safeFilename(name: string): string {
  const cleaned = String(name).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80)
  return /\.pdf$/i.test(cleaned) ? cleaned : 'tax-invoice.pdf'
}

export function decideTaxInvoiceReply(httpStatus: number, data: unknown): TaxInvoiceReply {
  if (httpStatus === 429) {
    return { kind: 'page', code: 429, title: 'Please try again shortly', message: 'Too many requests. Please try again in a minute.', retryAfter: 60 }
  }
  const d = (data ?? null) as Partial<StratumTaxInvoice> | null
  if (httpStatus === 200 && d && d.status === 'ready' && typeof (d as any).pdf_base64 === 'string' && (d as any).pdf_base64.length > 0) {
    const bytes = Buffer.from((d as any).pdf_base64, 'base64')
    // a real PDF starts with %PDF-: never serve anything else under an application/pdf label
    if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') {
      return { kind: 'pdf', filename: safeFilename(String((d as any).filename ?? '')), bytes }
    }
    return { kind: 'page', code: 502, title: 'Tax invoice unavailable', message: 'Your tax invoice could not be produced right now. Please try again shortly.' }
  }
  if (httpStatus === 200 && d && d.status === 'preparing') {
    return { kind: 'page', code: 202, title: 'Your tax invoice is being prepared', message: 'It is usually ready within a few minutes. Please refresh this page shortly.', retryAfter: 60 }
  }
  if (httpStatus === 200 && d && d.status === 'none') {
    return { kind: 'page', code: 404, title: 'No tax invoice for this order', message: 'We could not find a tax invoice for this order.' }
  }
  return { kind: 'page', code: 502, title: 'Tax invoice unavailable', message: 'Your tax invoice could not be loaded right now. Please try again shortly.' }
}

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c])

export function taxInvoicePageHtml(title: string, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1 style="font-size:1.25rem">${esc(title)}</h1><p>${esc(message)}</p></body></html>`
}
