// node --experimental-strip-types --test tests/tradePay.test.ts   (Node 22+). Pure decisions of paying invoices by bank transfer (Session 8d).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PAY_MAX_INVOICES, decidePayReply, normaliseAmount, parseBuyerFields, parseStartBody, validPaymentId } from '../utils/tradePay.ts'

test('payment ids: only the 26 character form the back office makes', () => {
  assert.equal(validPaymentId('01HZX3K9M7Q2R5T8V0WABCDEFG'), true)
  for (const id of ['', 'short', '01HZX3K9M7Q2R5T8V0WABCDEFG1', '../../etc/passwd0000000000', null, 7, undefined, '01HZX3K9M7Q2R5T8V0WABCDEF!']) assert.equal(validPaymentId(id), false, String(id))
})

test('the amount a buyer types: written the way people write money, plain "1250.00" out; anything that could mean two things is refused', () => {
  const good: Record<string, string> = {
    '1250': '1250.00', '1250.5': '1250.50', '1250.50': '1250.50', '1,250.00': '1250.00', 'R 1250': '1250.00', 'R1,250.50': '1250.50', 'r 1 250.00': '1250.00',
    'R 12,345,678.90': '12345678.90', '0.99': '0.99', ' 15 ': '15.00',
  }
  for (const [text, want] of Object.entries(good)) assert.equal(normaliseAmount(text), want, text)
  for (const bad of ['1,25', '12.345', '1250 rand', '-5', 'R', '', '1,2500.00', '1.250,00', 'R-10', '1e3', '1250.', '१२३', 'R R5', '1,250,00']) assert.equal(normaliseAmount(bad), null, JSON.stringify(bad))
  for (const junk of [null, undefined, 5, {}, ['5']]) assert.equal(normaliseAmount(junk), null)
})

test('starting a payment: every open invoice, or a list of ids; nothing else the browser adds travels on, and no amount is ever read', () => {
  assert.deepEqual(parseStartBody({ all: true }), { ok: true, body: { all: true } })
  assert.deepEqual(parseStartBody({ all: true, amount: 5, invoice_ids: undefined }), { ok: true, body: { all: true } })
  assert.deepEqual(parseStartBody({ invoice_ids: [101, 102, 101], amount: 99999, allocations: { 101: 5 } }), { ok: true, body: { invoice_ids: [101, 102] } })
  assert.equal(parseStartBody({ all: true, invoice_ids: [1] }).ok, true) // the explicit list wins over a stray flag
  for (const bad of [null, {}, { invoice_ids: [] }, { invoice_ids: 'all' }, { invoice_ids: ['101'] }, { invoice_ids: [0] }, { invoice_ids: [-1] }, { invoice_ids: [1.5] }, { invoice_ids: [3_000_000_000] }, { all: 'true' }]) {
    assert.equal(parseStartBody(bad).ok, false, JSON.stringify(bad))
  }
  assert.equal(parseStartBody({ invoice_ids: Array.from({ length: PAY_MAX_INVOICES }, (_, i) => i + 1) }).ok, true)
  assert.equal(parseStartBody({ invoice_ids: Array.from({ length: PAY_MAX_INVOICES + 1 }, (_, i) => i + 1) }).ok, false)
})

test('the two optional things on an upload: the reference the buyer used and the amount they say they paid, cleaned; a bad amount stops the upload', () => {
  assert.deepEqual(parseBuyerFields({}), { ok: true, reference: '', total: '' })
  assert.deepEqual(parseBuyerFields({ buyer_reference: '  ACME\nOCT\u0000 ', buyer_total: 'R 1,250.00', amount: 5, allocations: [1] }), { ok: true, reference: 'ACME OCT', total: '1250.00' })
  const long = parseBuyerFields({ buyer_reference: 'x'.repeat(300) })
  assert.equal(long.ok && long.reference.length, 100)
  const bad = parseBuyerFields({ buyer_total: '1,25' })
  assert.equal(bad.ok, false)
  if (!bad.ok) assert.match(bad.message, /R 1,250\.00/)
  assert.deepEqual(parseBuyerFields({ buyer_reference: 5, buyer_total: 5 }), { ok: true, reference: '', total: '' }) // not text: ignored, never trusted
  assert.deepEqual(parseBuyerFields(null), { ok: true, reference: '', total: '' })
})

test('the buyer is told the back office\'s own sentence for a refusal they can act on, and plain words for everything else', () => {
  assert.deepEqual(decidePayReply(200, { success: true, message: 'Thanks' }), { status: 200, ok: true, message: 'Thanks' })
  assert.equal(decidePayReply(200, { success: false }).ok, false)
  const refused = decidePayReply(409, { success: false, code: 'NOT_PAYABLE', error: 'One of those invoices is already paid.' })
  assert.deepEqual([refused.status, refused.ok, refused.message, refused.code], [409, false, 'One of those invoices is already paid.', 'NOT_PAYABLE'])
  assert.equal(decidePayReply(422, { error: 'Upload between 1 and 3 files.' }).message, 'Upload between 1 and 3 files.')
  assert.equal(decidePayReply(429, null).message, 'That was not accepted.')
  assert.equal(decidePayReply(401, {}).code, 'NOT_SIGNED_IN')
  assert.equal(decidePayReply(403, {}).code, 'NO_ACCOUNT_ACCESS')
  assert.equal(decidePayReply(404, {}).message, 'We could not find that payment.')
  for (const s of [0, 500, 502, 503, 418]) assert.equal(decidePayReply(s, { error: 'internal detail' }).status, 503, String(s))
  assert.doesNotMatch(decidePayReply(500, { error: 'SQLSTATE secret' }).message, /SQLSTATE/)
})
