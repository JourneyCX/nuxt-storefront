// A trade buyer's account area (Session 8c): the pure decisions, kept apart from the routes and pages so they can be tested on their own.
// Nothing here knows an amount except to print one: every figure the buyer sees was given by the back office, and the browser never sends one.

export const INVOICE_STATUSES = ['all', 'open', 'paid', 'cancelled', 'credit_notes'] as const
export type InvoiceStatus = typeof INVOICE_STATUSES[number]

export const STATUS_LABELS: Record<InvoiceStatus, string> = { all: 'All', open: 'Open', paid: 'Paid', cancelled: 'Cancelled', credit_notes: 'Credit notes' }

export const STATE_LABELS: Record<string, string> = { open: 'Open', part_paid: 'Part paid', overdue: 'Overdue', paid: 'Paid', cancelled: 'Cancelled', closed: 'Used up' }

export const SOURCE_LABELS: Record<string, string> = { trade_order: 'Trade order', pos: 'In store', online_store: 'Online store', marketplace: 'Marketplace', staff: 'Entered by our team' }

export const KIND_LABELS: Record<string, string> = { invoice: 'Invoice', payment: 'Payment', credit_note: 'Credit note', refund: 'Refund', cancellation: 'Invoice cancelled' }

/** Is this a real calendar day written YYYY-MM-DD? */
export function isDay(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function dayOf(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The invoice list's filter and cursor from a query string: an unknown filter is "all", a cursor of any other shape is dropped. */
export function parseInvoiceQuery(q: Record<string, unknown>): { status: InvoiceStatus; after: string | null } {
  const s = typeof q.status === 'string' ? q.status : ''
  const status = (INVOICE_STATUSES as readonly string[]).includes(s) ? (s as InvoiceStatus) : 'all'
  const a = typeof q.after === 'string' ? q.after : ''
  return { status, after: /^\d{4}-\d{2}-\d{2}\.[01]\.\d{1,10}$/.test(a) ? a : null }
}

/** The statement's dates: the last 90 days unless two real dates in order were given. */
export function parseStatementQuery(q: Record<string, unknown>, now: Date): { from: string; to: string } {
  const to = dayOf(now)
  const from = dayOf(new Date(now.getTime() - 90 * 86_400_000))
  const f = q.from
  const t = q.to
  if (isDay(f) && isDay(t) && f <= t) return { from: f, to: t }
  return { from, to }
}

/** 123450 -> "R 1 234.50" (minor units; a negative amount keeps its sign). Printing only: never parsed back. */
export function moneyText(minor: unknown): string {
  const n = typeof minor === 'number' && Number.isFinite(minor) ? Math.trunc(minor) : 0
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}R ${whole}.${String(abs % 100).padStart(2, '0')}`
}

/** Plain decimal for a file: 123450 -> "1234.50". */
export function decimalText(minor: unknown): string {
  const n = typeof minor === 'number' && Number.isFinite(minor) ? Math.trunc(minor) : 0
  const abs = Math.abs(n)
  return `${n < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** One CSV cell: quoted, and a leading = + - @ made harmless so a spreadsheet never runs text as a formula. */
export function csvCell(value: string): string {
  let v = value
  if (v !== '' && '=+-@\t\r'.includes(v[0]) && !/^-?\d+(\.\d+)?$/.test(v)) v = `'${v}`
  return `"${v.replace(/"/g, '""')}"`
}

export interface StatementLine { date: string; kind: string; reference: string; debit_minor: number; credit_minor: number; balance_minor: number }
export interface StatementData { from: string; to: string; opening_minor: number; closing_minor: number; lines: StatementLine[]; truncated: boolean }

/** The statement as a CSV (with a byte-order mark so a spreadsheet reads the text correctly). */
export function statementCsv(s: StatementData): string {
  const rows: string[][] = [['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance'], [s.from, 'Opening balance', '', '', '', decimalText(s.opening_minor)]]
  for (const l of s.lines) {
    rows.push([l.date, KIND_LABELS[l.kind] ?? l.kind, l.reference, l.debit_minor ? decimalText(l.debit_minor) : '', l.credit_minor ? decimalText(l.credit_minor) : '', decimalText(l.balance_minor)])
  }
  rows.push([s.to, 'Closing balance', '', '', '', decimalText(s.closing_minor)])
  if (s.truncated) rows.push(['', 'This statement was cut short; choose fewer days to see the rest.', '', '', '', ''])
  return `﻿${rows.map(r => r.map(csvCell).join(',')).join('\r\n')}\r\n`
}

export interface AccountReply { status: number; ok: boolean; message: string; code?: string }

/** What the buyer is told for the back office's answer. Its own sentence is used when it gave one for a refusal the buyer can fix. */
export function decideAccountReply(httpStatus: number, data: unknown): AccountReply {
  const d = (data ?? null) as { success?: boolean; error?: string; code?: string } | null
  if (httpStatus === 200 && d?.success === true) return { status: 200, ok: true, message: '' }
  if (httpStatus === 401) return { status: 401, ok: false, message: 'Please sign in to your trade account.', code: 'NOT_SIGNED_IN' }
  if (httpStatus === 403) return { status: 403, ok: false, message: String(d?.error || 'Your login does not include the account area.'), code: 'NO_ACCOUNT_ACCESS' }
  if (httpStatus === 404) return { status: 404, ok: false, message: 'We could not find that.' }
  if (httpStatus === 410) return { status: 410, ok: false, message: String(d?.error || 'This invoice was cancelled.'), code: 'SUPERSEDED' }
  if (httpStatus === 422) return { status: 422, ok: false, message: String(d?.error || 'Please check the dates.'), code: 'DATES' }
  if (httpStatus === 429) return { status: 429, ok: false, message: 'Too many requests. Please try again in a minute.' }
  return { status: 503, ok: false, message: 'Your account figures cannot be fetched right now. Please try again in a few minutes.', code: 'ACCOUNT_UNAVAILABLE' }
}
