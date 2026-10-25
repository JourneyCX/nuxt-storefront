// node --experimental-strip-types --test tests/tradeAccount.test.ts   (Node 22+). Pure decisions of the trade account area (Session 8c).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csvCell, decideAccountReply, decimalText, isDay, moneyText, parseInvoiceQuery, parseStatementQuery, statementCsv } from '../utils/tradeAccount.ts'

test('days: only real calendar days in YYYY-MM-DD', () => {
  assert.equal(isDay('2026-10-25'), true)
  assert.equal(isDay('2024-02-29'), true)
  for (const d of ['2026-02-30', '2026-13-01', '25/10/2026', '2026-1-5', '', 'yesterday', 20261025, null, undefined, '2026-10-25 ']) assert.equal(isDay(d), false, String(d))
})

test('the invoice list: an unknown filter is "all", a cursor of the wrong shape is dropped, the right shape passes', () => {
  assert.deepEqual(parseInvoiceQuery({}), { status: 'all', after: null })
  assert.deepEqual(parseInvoiceQuery({ status: 'open', after: '2026-10-06.1.9' }), { status: 'open', after: '2026-10-06.1.9' })
  assert.deepEqual(parseInvoiceQuery({ status: 'everything', after: '1; DROP TABLE x' }), { status: 'all', after: null })
  assert.deepEqual(parseInvoiceQuery({ status: ['open'], after: ['2026-10-06.1.9'] }), { status: 'all', after: null })
  assert.deepEqual(parseInvoiceQuery({ status: 'credit_notes', after: '2026-10-06.2.9' }), { status: 'credit_notes', after: null })
})

test('the statement dates: the last 90 days by default, and only two real dates in order replace them', () => {
  const now = new Date('2026-10-25T09:00:00Z')
  const def = { from: '2026-07-27', to: '2026-10-25' }
  assert.deepEqual(parseStatementQuery({}, now), def)
  assert.deepEqual(parseStatementQuery({ from: '2026-09-01', to: '2026-10-15' }, now), { from: '2026-09-01', to: '2026-10-15' })
  assert.deepEqual(parseStatementQuery({ from: '2026-10-15', to: '2026-09-01' }, now), def)
  assert.deepEqual(parseStatementQuery({ from: 'yesterday', to: '2026-10-15' }, now), def)
  assert.deepEqual(parseStatementQuery({ from: '2026-09-01' }, now), def)
  assert.deepEqual(parseStatementQuery({ from: '2026-10-15', to: '2026-10-15' }, now), { from: '2026-10-15', to: '2026-10-15' })
})

test('money printing: minor units, thousands spaced, cents always two digits, a negative keeps its sign, junk prints as zero', () => {
  assert.equal(moneyText(0), 'R 0.00')
  assert.equal(moneyText(5), 'R 0.05')
  assert.equal(moneyText(123450), 'R 1 234.50')
  assert.equal(moneyText(100000000), 'R 1 000 000.00')
  assert.equal(moneyText(-4050), '-R 40.50')
  for (const junk of [null, undefined, 'x', NaN, Infinity]) assert.equal(moneyText(junk), 'R 0.00')
  assert.equal(decimalText(123450), '1234.50')
  assert.equal(decimalText(-5), '-0.05')
})

test('a spreadsheet cell can never run as a formula, and quotes are doubled', () => {
  assert.equal(csvCell('INV-000001'), '"INV-000001"')
  assert.equal(csvCell('=HYPERLINK("http://x.test")'), '"\'=HYPERLINK(""http://x.test"")"')
  for (const t of ['+1+1', '-cmd', '@SUM(A1)', '\tcmd']) assert.ok(csvCell(t).startsWith('"\''), t)
  assert.equal(csvCell('-12.50'), '"-12.50"')   // a plain negative amount is still a number
  assert.equal(csvCell(''), '""')
})

test('the statement file: byte-order mark, header, opening, every line, closing; a cut statement says so', () => {
  const csv = statementCsv({
    from: '2026-09-01', to: '2026-10-25', opening_minor: 40000, closing_minor: 90000, truncated: false,
    lines: [
      { date: '2026-10-01', kind: 'invoice', reference: 'INV-000002', debit_minor: 50000, credit_minor: 0, balance_minor: 90000 },
      { date: '2026-10-03', kind: 'payment', reference: '=1+1', debit_minor: 0, credit_minor: 10000, balance_minor: 80000 },
    ],
  })
  const rows = csv.replace(/^﻿/, '').trimEnd().split('\r\n')
  assert.ok(csv.startsWith('﻿"Date","Type","Reference","Debit","Credit","Balance"'))
  assert.equal(rows[1], '"2026-09-01","Opening balance","","","","400.00"')
  assert.equal(rows[2], '"2026-10-01","Invoice","INV-000002","500.00","","900.00"')
  assert.equal(rows[3], '"2026-10-03","Payment","\'=1+1","","100.00","800.00"')
  assert.equal(rows[4], '"2026-10-25","Closing balance","","","","900.00"')
  assert.equal(rows.length, 5)
  const cut = statementCsv({ from: '2026-09-01', to: '2026-10-25', opening_minor: 0, closing_minor: 0, lines: [], truncated: true })
  assert.match(cut, /cut short/)
})

test('what the buyer is told: success passes, a contact without the right is told so in the back office\'s words, outages are one calm sentence', () => {
  assert.deepEqual(decideAccountReply(200, { success: true }), { status: 200, ok: true, message: '' })
  assert.equal(decideAccountReply(200, { success: false }).ok, false)
  assert.equal(decideAccountReply(401, {}).code, 'NOT_SIGNED_IN')
  const no = decideAccountReply(403, { error: 'Your login does not include the account area.' })
  assert.equal(no.status, 403); assert.equal(no.code, 'NO_ACCOUNT_ACCESS'); assert.match(no.message, /account area/)
  assert.equal(decideAccountReply(410, { error: 'This invoice was cancelled.' }).code, 'SUPERSEDED')
  assert.equal(decideAccountReply(422, { error: 'Choose a shorter period.' }).message, 'Choose a shorter period.')
  assert.equal(decideAccountReply(429, {}).status, 429)
  for (const status of [0, 500, 502, 503, 504]) {
    const r = decideAccountReply(status, null)
    assert.equal(r.status, 503); assert.equal(r.ok, false); assert.equal(r.code, 'ACCOUNT_UNAVAILABLE')
  }
})
