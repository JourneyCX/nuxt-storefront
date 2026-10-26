// A stand-in for the back office, only for the real-browser test of the pay-invoices page (tools/browser/pay-upload.mjs).
// It answers exactly the signed calls the storefront makes, KEEPS what it received, and checks the HMAC signature the way the real one does, so a
// storefront that sends a wrong signature, a wrong body or an extra amount fails the test instead of passing silently.
//
// It is NOT a copy of the back office's rules (those are tested in the back office's own repository); it is a recorder with just enough behaviour
// to let a real browser drive the real storefront server from the first click to the last.

import http from 'node:http'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const TENANT_ID = 7
export const SECRET = 'browser-test-hmac-secret'
export const SID = 'a'.repeat(64)

const INVOICES = [
  { id: 101, number: 'INV-000101', due_date: '2026-08-01', balance_minor: 40000 },
  { id: 102, number: 'INV-000102', due_date: '2026-09-01', balance_minor: 30000 },
  { id: 103, number: 'INV-000103', due_date: '2026-10-01', balance_minor: 20000 },
]
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function startFakeBackoffice(port) {
  const state = { calls: [], badSignatures: 0, payments: [], paidMeanwhile: new Set() }

  const code = () => 'PAY-' + Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')
  const view = (p) => ({
    id: p.id, reference: p.reference, reference_kind: p.reference_kind, status: p.status, status_label: p.status, created_at: '2026-10-26 09:00:00',
    uploaded_at: p.uploaded_at, buyer_reference: p.buyer_reference, buyer_total_minor: p.buyer_total_minor, decline_reason: null, closing_note: null,
    total_minor: p.lines.reduce((n, l) => n + l.balance_minor, 0), files: p.files, bank_details: 'FNB\nAccount 62000000000\nBranch 250655',
    lines: p.lines.map(l => ({ invoice_id: l.id, number: l.number, due_date: l.due_date, balance_minor: l.balance_minor, state: 'open', state_label: 'Not recorded yet', also_waiting: l.also_waiting })),
  })

  const signatureOk = (req, raw) => {
    const h = req.headers
    const expected = createHmac('sha256', SECRET)
      .update([String(h['x-stratum-tenant']), String(h['x-stratum-timestamp']), String(h['x-stratum-nonce']), createHash('sha256').update(raw).digest('hex'), String(h['x-stratum-client-ip'])].join('\n'))
      .digest('hex')
    const given = String(h['x-stratum-signature'] || '')
    return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected)) && String(h['x-stratum-tenant']) === String(TENANT_ID)
  }

  const answer = (action, body) => {
    switch (action) {
      case 'storefront_mode': return [200, { success: true, mode: 'hybrid', window_price: 'hidden', public_pages: [] }]
      case 'trade_session':
        return body.sid === SID
          ? [200, { success: true, active: true, reason: '', checkout: true, buyer: { contact_id: 1, company_id: 1, company_name: 'Acme Hardware', contact_name: 'Sipho', location_id: null } }]
          : [401, { success: false }]
      case 'account_pay_options': {
        const taken = new Set(state.payments.filter(p => p.status === 'pending').flatMap(p => p.lines.map(l => l.id)))
        return [200, {
          success: true, eft: true, complete: true,
          invoices: INVOICES.filter(i => !state.paidMeanwhile.has(i.id)).map(i => ({ ...i, overdue: true, also_waiting: taken.has(i.id) })),
          orders: [{ number: 'B2B-901', balance_minor: 20000 }],
        }]
      }
      case 'account_pay_start': {
        const ids = body.all === true ? INVOICES.map(i => i.id) : body.invoice_ids
        if (!Array.isArray(ids) || ids.some(i => !INVOICES.find(x => x.id === i) || state.paidMeanwhile.has(i))) {
          return [409, { success: false, code: 'NOT_PAYABLE', error: 'One of those invoices is already paid or cannot be paid here. Please refresh the list and choose again.' }]
        }
        const lines = ids.map(i => ({ ...INVOICES.find(x => x.id === i), also_waiting: false }))
        const p = {
          id: 'P' + String(state.payments.length + 1).padStart(25, '0'), status: 'requested', files: [], buyer_reference: null, buyer_total_minor: null, uploaded_at: null,
          reference_kind: lines.length === 1 ? 'invoice_number' : 'code', reference: lines.length === 1 ? lines[0].number : code(), lines,
        }
        state.payments.push(p)
        return [200, { success: true, payment: view(p) }]
      }
      case 'account_pay_upload': {
        const p = state.payments.find(x => x.id === body.payment)
        if (!p) return [404, { success: false, code: 'NOT_FOUND', error: 'Payment not found.' }]
        if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > 3) return [422, { success: false, code: 'FILES', error: 'Upload between 1 and 3 files.' }]
        p.files.push(...body.files.map(f => f.name))
        p.status = 'pending'
        p.uploaded_at = '2026-10-26 09:05:00'
        if (body.buyer_reference) p.buyer_reference = body.buyer_reference
        if (body.buyer_total) p.buyer_total_minor = Math.round(Number(body.buyer_total) * 100)
        return [200, { success: true, message: 'Thank you. We will check your proof of payment and record it against your invoices.', payment: view(p) }]
      }
      case 'account_pay_list': return [200, { success: true, eft: true, payments: [...state.payments].reverse().map(view) }]
      default: return [404, { success: false, error: 'unknown ' + action }]
    }
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://x')
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
    if (req.method === 'GET' && url.pathname === '/admin/store_builder_api/tenant_by_domain') return send(200, { tenantId: TENANT_ID, woocommerceUrl: null, wooStoreId: null })
    if (req.method === 'GET' && url.pathname === '/__state') return send(200, { calls: state.calls, badSignatures: state.badSignatures, payments: state.payments })
    if (req.method === 'POST' && url.pathname === '/__paid_meanwhile') { state.paidMeanwhile.add(103); return send(200, { ok: true }) }
    const m = url.pathname.match(/^\/b2b_public\/([a-z_]+)$/)
    if (req.method !== 'POST' || !m) return send(404, { success: false })
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      if (!signatureOk(req, raw)) { state.badSignatures++; return send(403, { success: false, error: 'bad signature' }) }
      let body = {}
      try { body = JSON.parse(raw) } catch { /* empty */ }
      if (!m[1].startsWith('storefront') && !m[1].startsWith('trade_session')) state.calls.push({ action: m[1], body })
      const [status, data] = answer(m[1], body)
      send(status, data)
    })
  })
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, state })))
}
