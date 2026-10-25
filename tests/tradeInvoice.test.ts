// node --experimental-strip-types --test tests/tradeInvoice.test.ts   (Node 22+). Pure decisions of the trade invoice link (decision 3c).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideInvoiceReply, validInvoiceToken } from '../server/utils/tradeInvoice.ts'

const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n').toString('base64')

test('tokens: only what the platform makes (base64url, 20 to 64 characters)', () => {
  assert.equal(validInvoiceToken('abcDEF123_-abcDEF123_-abcDEF12'), true)
  for (const t of ['', 'short', '../etc/passwd', 'a b c d e f g h i j k l m n o p', 'x'.repeat(65), 'abc.def.ghi.jkl.mno.pqr.stu', 'abcdefghijklmnopqrst\n']) {
    assert.equal(validInvoiceToken(t), false, JSON.stringify(t))
  }
})

test('a real PDF is served as a PDF with a safe file name', () => {
  const r = decideInvoiceReply(200, { success: true, filename: 'INV-000123.pdf', pdf_base64: pdf })
  assert.equal(r.kind, 'pdf')
  if (r.kind === 'pdf') { assert.equal(r.filename, 'INV-000123.pdf'); assert.equal(r.bytes.subarray(0, 5).toString(), '%PDF-') }
  const odd = decideInvoiceReply(200, { success: true, filename: '../../x"y\r\n.pdf', pdf_base64: pdf })
  assert.equal(odd.kind, 'pdf'); if (odd.kind === 'pdf') assert.match(odd.filename, /^[A-Za-z0-9._-]+\.pdf$/)
  const none = decideInvoiceReply(200, { success: true, filename: '', pdf_base64: pdf })
  assert.equal(none.kind, 'pdf'); if (none.kind === 'pdf') assert.equal(none.filename, 'invoice.pdf')
})

test('anything that is not really a PDF is never served under a PDF label', () => {
  const html = Buffer.from('<html>oops</html>').toString('base64')
  for (const body of [{ success: true, filename: 'x.pdf', pdf_base64: html }, { success: true, filename: 'x.pdf', pdf_base64: '' }, { success: false, pdf_base64: pdf }, null, 'text']) {
    const r = decideInvoiceReply(200, body)
    assert.equal(r.kind, 'page', JSON.stringify(body)); if (r.kind === 'page') assert.equal(r.code, 502)
  }
})

test('a cancelled invoice says so (410), an unknown or expired link is a 404, a rate limit is a 429, anything else is a 502', () => {
  const gone = decideInvoiceReply(410, { success: false, code: 'SUPERSEDED' })
  assert.equal(gone.kind, 'page'); if (gone.kind === 'page') { assert.equal(gone.code, 410); assert.match(gone.message, /credit note/) }
  const nf = decideInvoiceReply(404, { success: false })
  assert.equal(nf.kind, 'page'); if (nf.kind === 'page') assert.equal(nf.code, 404)
  const rl = decideInvoiceReply(429, null)
  assert.equal(rl.kind, 'page'); if (rl.kind === 'page') { assert.equal(rl.code, 429); assert.equal(rl.retryAfter, 60) }
  for (const s of [400, 413, 500, 503]) {
    const r = decideInvoiceReply(s, { success: false })
    assert.equal(r.kind, 'page'); if (r.kind === 'page') assert.equal(r.code, 502)
  }
})

test('the wording names no platform and no Perfex (the white-label rule)', () => {
  const words = [410, 404, 429, 503].map(s => { const r = decideInvoiceReply(s, s === 410 ? { code: 'SUPERSEDED' } : null); return r.kind === 'page' ? `${r.title} ${r.message}` : '' }).join(' ')
  assert.doesNotMatch(words, /stratum|perfex|journeycx|admin/i)
})
