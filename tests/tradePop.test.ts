// node --experimental-strip-types --test tests/tradePop.test.ts   (Node 22+). Pure decisions of the proof-of-payment upload (Session 6c).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decidePopReply, parsePopBody, validOrderRef, POP_MAX_FILE_BYTES } from '../server/utils/tradePop.ts'

const b64 = (s: string) => Buffer.from(s).toString('base64')

test('order references: only the storefront\'s own B2B-n form', () => {
  assert.equal(validOrderRef('B2B-12'), true)
  for (const r of ['', 'B2B-', 'b2b-1', 'B2B-1a', 'B2B-12345678901', '../x', 'B2B-1\n', 'INV-1']) assert.equal(validOrderRef(r), false, JSON.stringify(r))
})

test('a good body keeps only name and data of each file and drops anything else the browser added', () => {
  const r = parsePopBody(JSON.stringify({ amount: 5, status: 'confirmed', files: [{ name: 'slip.pdf', data: b64('%PDF-1.4 x'), mime: 'text/html', stored_name: 'x' }] }))
  assert.equal(r.ok, true)
  if (r.ok) { assert.deepEqual(Object.keys(r.files[0]).sort(), ['data', 'name']); assert.equal(r.files[0].name, 'slip.pdf') }
})

test('bad bodies stop here: not JSON, no files, too many files, a file that is not base64, an oversized file, a missing name gets a default', () => {
  const one = { name: 'a.pdf', data: b64('%PDF-1.4') }
  for (const raw of ['not json', '{}', JSON.stringify({ files: [] }), JSON.stringify({ files: 'x' }), JSON.stringify({ files: [one, one, one, one] }),
    JSON.stringify({ files: [{ name: 'a', data: '***' }] }), JSON.stringify({ files: [{ name: 'a', data: '' }] }), JSON.stringify({ files: [null] }),
    JSON.stringify({ files: [{ name: 'a', data: 'A'.repeat(Math.ceil(POP_MAX_FILE_BYTES / 3) * 4 + 4) }] })]) {
    assert.equal(parsePopBody(raw).ok, false, raw.slice(0, 60))
  }
  const named = parsePopBody(JSON.stringify({ files: [{ data: b64('%PDF-1.4') }] }))
  assert.equal(named.ok, true); if (named.ok) assert.equal(named.files[0].name, 'proof')
  const long = parsePopBody(JSON.stringify({ files: [{ name: 'x'.repeat(400), data: b64('%PDF-1.4') }] }))
  assert.equal(long.ok, true); if (long.ok) assert.equal(long.files[0].name.length, 255)
})

test('the buyer is told in plain words: accepted, signed out, unknown order, throttled, refused with the platform\'s own sentence, and anything else is a neutral 502', () => {
  const ok = decidePopReply(200, { success: true, accepted: 2, message: 'Thank you.', proofs: [{ name: 'a', status: 'pending' }] })
  assert.equal(ok.ok, true); assert.equal(ok.accepted, 2); assert.equal(ok.proofs?.length, 1)
  assert.equal(decidePopReply(401, null).message, 'Please sign in to your trade account.')
  assert.equal(decidePopReply(404, { error: 'Order not found.' }).status, 404)
  assert.equal(decidePopReply(429, { error: 'Too many uploads for this order. Please try again later.' }).status, 429)
  const refused = decidePopReply(422, { success: false, error: 'Only PDF, JPEG and PNG files can be uploaded.' })
  assert.equal(refused.ok, false); assert.equal(refused.message, 'Only PDF, JPEG and PNG files can be uploaded.')
  assert.equal(decidePopReply(409, { error: 'This order is not waiting for a payment.' }).status, 409)
  for (const s of [0, 500, 503]) assert.equal(decidePopReply(s, { error: 'internal detail' }).status, 502)
  assert.doesNotMatch(decidePopReply(500, { error: 'SQLSTATE secret' }).message, /SQLSTATE|secret/)
})

test('the wording names no platform and no Perfex (the white-label rule)', () => {
  const words = [401, 404, 429, 409, 500].map(s => decidePopReply(s, null).message).join(' ')
  assert.doesNotMatch(words, /stratum|perfex|journeycx|admin/i)
})
