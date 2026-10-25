import { accountCall } from '~/server/utils/tradeAccountApi'
import { parseInvoiceQuery } from '~/utils/tradeAccount'

// GET /api/trade/account/invoices?status=open&after=... -- a page of the company's invoices and credit notes. Filter and cursor are validated here
// and again by the back office; a company is never named by the browser.
export default defineEventHandler(async (event) => {
  const { status, after } = parseInvoiceQuery(getQuery(event))
  const d = await accountCall(event, 'account_invoices', { status, ...(after ? { after } : {}) })
  return { status: d.status_filter, rows: d.rows, next_after: d.next_after }
})
