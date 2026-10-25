import { accountCall } from '~/server/utils/tradeAccountApi'

// GET /api/trade/account/invoice/12 -- one of the company's own invoices as a PDF. The back office checks the invoice belongs to this contact's company.
export default defineEventHandler(async (event) => {
  const raw = String(getRouterParam(event, 'id') ?? '')
  if (!/^[1-9]\d{0,9}$/.test(raw)) throw createError({ statusCode: 404, statusMessage: 'We could not find that invoice.' })
  const d = await accountCall(event, 'account_invoice_pdf', { invoice_id: Number(raw) })
  const res = event.node.res
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${String(d.filename || 'invoice.pdf').replace(/[^A-Za-z0-9._-]/g, '_')}"`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return Buffer.from(String(d.pdf_base64 || ''), 'base64')
})
