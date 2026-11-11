import { payCall } from '~/server/utils/tradePay'

// GET /api/trade/account/pay/list -- the payments the company has started and what became of each (name, state, reference, a note if there is one).
export default defineEventHandler(async (event) => {
  const d = await payCall(event, 'account_pay_list')
  return { eft: Boolean(d.eft), payments: Array.isArray(d.payments) ? d.payments : [] }
})
