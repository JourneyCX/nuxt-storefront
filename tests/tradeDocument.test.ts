// node --experimental-strip-types --test tests/tradeDocument.test.ts   (Node 22+). Pure decisions of the statement and credit-note links (Session 8e).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { decideDocumentReply, DOCUMENT_CALLS, type DocumentKind } from '../server/utils/tradeDocument.ts'

const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n').toString('base64')
const kinds: DocumentKind[] = ['statement', 'credit_note']

test('each kind asks the platform call of its own', () => {
  assert.equal(DOCUMENT_CALLS.statement, 'statement_get')
  assert.equal(DOCUMENT_CALLS.credit_note, 'credit_note_get')
})

test('a real PDF is served as a PDF with a safe file name, and a missing name falls back to one for the kind', () => {
  for (const k of kinds) {
    const r = decideDocumentReply(k, 200, { success: true, filename: 'Statement_2026-10-01_2026-10-31.pdf', pdf_base64: pdf })
    assert.equal(r.kind, 'pdf')
    if (r.kind === 'pdf') { assert.equal(r.filename, 'Statement_2026-10-01_2026-10-31.pdf'); assert.equal(r.bytes.subarray(0, 5).toString(), '%PDF-') }
    const odd = decideDocumentReply(k, 200, { success: true, filename: '../../x"y\r\n.pdf', pdf_base64: pdf })
    assert.equal(odd.kind, 'pdf'); if (odd.kind === 'pdf') assert.match(odd.filename, /^[A-Za-z0-9._-]+\.pdf$/)
  }
  const none = decideDocumentReply('statement', 200, { success: true, filename: '', pdf_base64: pdf })
  assert.equal(none.kind, 'pdf'); if (none.kind === 'pdf') assert.equal(none.filename, 'statement.pdf')
  const noneCn = decideDocumentReply('credit_note', 200, { success: true, filename: '', pdf_base64: pdf })
  assert.equal(noneCn.kind, 'pdf'); if (noneCn.kind === 'pdf') assert.equal(noneCn.filename, 'credit-note.pdf')
})

test('anything that is not really a PDF is never served under a PDF label', () => {
  const html = Buffer.from('<html>oops</html>').toString('base64')
  for (const k of kinds) {
    for (const body of [{ success: true, filename: 'x.pdf', pdf_base64: html }, { success: true, filename: 'x.pdf', pdf_base64: '' }, { success: false, pdf_base64: pdf }, null, 'text']) {
      const r = decideDocumentReply(k, 200, body)
      assert.equal(r.kind, 'page', JSON.stringify(body)); if (r.kind === 'page') assert.equal(r.code, 502)
    }
  }
})

test('a cancelled credit note says so (410), an unknown, expired or no-longer-allowed link is a 404, a rate limit is a 429, anything else is a 502', () => {
  const gone = decideDocumentReply('credit_note', 410, { success: false, code: 'SUPERSEDED' })
  assert.equal(gone.kind, 'page'); if (gone.kind === 'page') { assert.equal(gone.code, 410); assert.match(gone.title, /credit note/) }
  for (const k of kinds) {
    const nf = decideDocumentReply(k, 404, { success: false })
    assert.equal(nf.kind, 'page'); if (nf.kind === 'page') { assert.equal(nf.code, 404); assert.match(nf.message, k === 'statement' ? /statement/ : /credit note/) }
    const rl = decideDocumentReply(k, 429, null)
    assert.equal(rl.kind, 'page'); if (rl.kind === 'page') { assert.equal(rl.code, 429); assert.equal(rl.retryAfter, 60) }
    for (const s of [400, 413, 500, 503]) {
      const r = decideDocumentReply(k, s, { success: false })
      assert.equal(r.kind, 'page'); if (r.kind === 'page') assert.equal(r.code, 502)
    }
  }
})

test('the wording names no platform and no Perfex (the white-label rule)', () => {
  const words = kinds.flatMap(k => [410, 404, 429, 503, 200].map(s => { const r = decideDocumentReply(k, s, s === 410 ? { code: 'SUPERSEDED' } : null); return r.kind === 'page' ? `${r.title} ${r.message}` : '' })).join(' ')
  assert.doesNotMatch(words, /stratum|perfex|journeycx|admin/i)
})

test('the routes exist at the paths the mails link to, and the hub offers the credit note download', () => {
  const read = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
  assert.match(read('server/routes/trade/statement/[token].get.ts'), /serveDocumentLink\(event, 'statement'\)/)
  assert.match(read('server/routes/trade/credit-note/[token].get.ts'), /serveDocumentLink\(event, 'credit_note'\)/)
  assert.match(read('server/api/trade/account/credit-note/[id].get.ts'), /account_credit_note_pdf/)
  assert.match(read('pages/trade/account/invoices.vue'), /\/api\/trade\/account\/credit-note\//)
})
