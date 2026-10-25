import { accountCall } from '~/server/utils/tradeAccountApi'
import { parseStatementQuery, statementCsv } from '~/utils/tradeAccount'

// GET /api/trade/account/statement.csv?from=&to= -- the same statement as a spreadsheet file.
export default defineEventHandler(async (event) => {
  const { from, to } = parseStatementQuery(getQuery(event), new Date())
  const d = await accountCall(event, 'account_statement', { from, to })
  const res = event.node.res
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="statement-${from}-to-${to}.csv"`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return statementCsv({ from, to, opening_minor: d.opening_minor, closing_minor: d.closing_minor, lines: d.lines, truncated: Boolean(d.truncated) })
})
