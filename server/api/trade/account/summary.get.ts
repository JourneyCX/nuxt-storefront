import { accountCall } from '~/server/utils/tradeAccountApi'

// GET /api/trade/account/summary -- the signed-in company's balance, bands and credit, as the back office reports them now.
export default defineEventHandler(async (event) => {
  const d = await accountCall(event, 'account_summary')
  const { success: _s, ...rest } = d
  return rest
})
