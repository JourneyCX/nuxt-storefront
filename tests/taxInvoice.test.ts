// node --experimental-strip-types --test tests/taxInvoice.test.ts   (Node 22+). Pure decisions of the shopper's tax-invoice link.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideTaxInvoiceReply, safeFilename, taxInvoicePageHtml, validTaxInvoiceParams } from '../server/utils/taxInvoice.ts'

const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n').toString('base64')

test('params: a plain order id and a WooCommerce order key only', () => {
  assert.equal(validTaxInvoiceParams('77', 'wc_order_AbC123xyz'), true)
  for (const [id, key] of [['0', 'wc_order_AbC123xyz'], ['07', 'wc_order_AbC123xyz'], ['7a', 'wc_order_AbC123xyz'], ['77', 'short'], ['77', 'bad key/../x'], ['77', 'a'.repeat(65)], ['', ''], ['1'.repeat(13), 'wc_order_AbC123xyz']]) {
    assert.equal(validTaxInvoiceParams(id, key), false, `${id} ${key}`)
  }
})

test('a ready PDF is served as a PDF with a safe file name', () => {
  const r = decideTaxInvoiceReply(200, { status: 'ready', filename: 'tax-invoice-77.pdf', pdf_base64: pdf })
  assert.equal(r.kind, 'pdf')
  if (r.kind === 'pdf') { assert.equal(r.filename, 'tax-invoice-77.pdf'); assert.equal(r.bytes.subarray(0, 5).toString(), '%PDF-') }
})

test('anything that is not really a PDF is never served under a PDF label', () => {
  const html = Buffer.from('<html>oops</html>').toString('base64')
  const r = decideTaxInvoiceReply(200, { status: 'ready', filename: 'x.pdf', pdf_base64: html })
  assert.equal(r.kind, 'page'); if (r.kind === 'page') assert.equal(r.code, 502)
  assert.equal(decideTaxInvoiceReply(200, { status: 'ready', filename: 'x.pdf', pdf_base64: '' }).kind, 'page')
})

test('preparing waits (202 + Retry-After), none is a 404, a rate limit is a 429', () => {
  const p = decideTaxInvoiceReply(200, { status: 'preparing' }); assert.equal(p.kind, 'page'); if (p.kind === 'page') { assert.equal(p.code, 202); assert.equal(p.retryAfter, 60) }
  const n = decideTaxInvoiceReply(200, { status: 'none' }); assert.equal(n.kind, 'page'); if (n.kind === 'page') assert.equal(n.code, 404)
  const l = decideTaxInvoiceReply(429, null); assert.equal(l.kind, 'page'); if (l.kind === 'page') assert.equal(l.code, 429)
})

test('a failed or unreadable Stratum answer is a 502 page, never a guess', () => {
  for (const [status, data] of [[500, null], [403, { error: 'Forbidden.' }], [200, null], [200, { status: 'weird' }], [200, 'x']] as const) {
    const r = decideTaxInvoiceReply(status, data as unknown); assert.equal(r.kind, 'page'); if (r.kind === 'page') assert.equal(r.code, 502)
  }
})

test('file names are cleaned and always end in .pdf', () => {
  assert.equal(safeFilename('tax-invoice-77.pdf'), 'tax-invoice-77.pdf')
  assert.equal(safeFilename('../../etc/passwd'), 'tax-invoice.pdf')
  assert.equal(safeFilename('a b"c\r\n.pdf'), 'a_b_c_.pdf')
  assert.equal(safeFilename(''), 'tax-invoice.pdf')
})

test('the waiting page escapes its text and asks not to be indexed', () => {
  const h = taxInvoicePageHtml('<script>x</script>', 'a "quote" & more')
  assert.ok(!h.includes('<script>')); assert.ok(h.includes('&lt;script&gt;')); assert.ok(h.includes('&quot;quote&quot;')); assert.ok(h.includes('noindex'))
})
