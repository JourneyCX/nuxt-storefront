import { payCall } from '~/server/utils/tradePay'

// GET /api/trade/account/pay/options -- what the company can pay now (open invoices, oldest due first), and its orders that are waiting for a
// prepayment, which are paid on the order's own page.
export default defineEventHandler(async (event) => {
  const d = await payCall(event, 'account_pay_options')
  const { success: _s, ...rest } = d
  return rest
})
