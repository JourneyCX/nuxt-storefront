import { requireSameOrigin } from '~/server/utils/tradeApi'
import { readTextLimited } from '~/server/utils/stratumSigning'
import { payCall } from '~/server/utils/tradePay'
import { parseStartBody } from '~/utils/tradePay'

// POST /api/trade/account/pay/start -- the buyer chooses invoices (or everything open) and is given the reference to pay with.
// The body names invoices by id and nothing else; no amount is read, here or at the back office.
export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  let raw: unknown = null
  try { raw = JSON.parse(await readTextLimited(event, 4096)) } catch { /* shape-checked below */ }
  const body = parseStartBody(raw)
  if (!body.ok) throw createError({ statusCode: 422, statusMessage: body.message })
  const d = await payCall(event, 'account_pay_start', body.body)
  return { payment: d.payment }
})
