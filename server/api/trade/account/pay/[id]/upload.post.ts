import { requireSameOrigin } from '~/server/utils/tradeApi'
import { readTextLimited } from '~/server/utils/stratumSigning'
import { payCall } from '~/server/utils/tradePay'
import { parsePopBody } from '~/server/utils/tradePop'
import { parseBuyerFields, validPaymentId } from '~/utils/tradePay'

// POST /api/trade/account/pay/<payment id>/upload -- the buyer's proof of payment for a payment they started: the files, and optionally the
// reference they used and the amount they paid (kept for the merchant to compare, never used as an amount). The back office checks the company,
// the limits and the file CONTENT; this route adds the same-origin rule and a size cap. Needs nginx `client_max_body_size 25m` (verify-live list).
const MAX_BODY = 22 * 1024 * 1024

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  if (!validPaymentId(id)) throw createError({ statusCode: 404, statusMessage: 'We could not find that payment.' })
  const res = event.node.res
  res.setHeader('Cache-Control', 'private, no-store')

  const raw = await readTextLimited(event, MAX_BODY)
  const files = parsePopBody(raw)
  let parsed: unknown = null
  try { parsed = JSON.parse(raw) } catch { /* parsePopBody already refused unreadable JSON */ }
  const fields = parseBuyerFields(parsed)
  if (!files.ok || !fields.ok) {
    res.statusCode = 422
    return { ok: false, message: !files.ok ? files.message : (fields as { message: string }).message }
  }
  try {
    const d = await payCall(event, 'account_pay_upload', { payment: id, files: files.files, buyer_reference: fields.reference, buyer_total: fields.total })
    return { ok: true, message: String(d.message || 'Thank you. We will check your proof of payment.'), payment: d.payment }
  } catch (e: any) {
    res.statusCode = Number(e?.statusCode) || 502
    return { ok: false, message: String(e?.statusMessage || 'The upload could not be completed right now. Please try again in a few minutes.'), code: e?.data?.code ?? null }
  }
})
