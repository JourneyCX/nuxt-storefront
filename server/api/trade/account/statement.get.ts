import { accountCall } from '~/server/utils/tradeAccountApi'
import { parseStatementQuery } from '~/utils/tradeAccount'

// GET /api/trade/account/statement?from=&to= -- opening balance, every movement with a running balance, closing balance.
export default defineEventHandler(async (event) => {
  const { from, to } = parseStatementQuery(getQuery(event), new Date())
  const d = await accountCall(event, 'account_statement', { from, to })
  const { success: _s, ...rest } = d
  return rest
})
