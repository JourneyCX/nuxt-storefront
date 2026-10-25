import type { H3Event } from 'h3'
import { tradeState } from '~/server/utils/tradeContext'
import { requireTradeEnabled } from '~/server/utils/tradeApi'
import { cartCall } from '~/server/utils/tradeCart'
import { decideAccountReply } from '~/utils/tradeAccount'

// The signed-in buyer's account area (Session 8c). One signed call per page load, carrying the trade session from the HttpOnly cookie;
// the company, the contact's right to look and every figure are decided by the back office. Nothing is cached anywhere.

/** One account call. Throws a plain-words error for anything but success (the page shows the message). */
export async function accountCall(event: H3Event, action: string, body: Record<string, unknown> = {}): Promise<any> {
  requireTradeEnabled(event)
  if (!tradeState(event).active) throw createError({ statusCode: 401, statusMessage: 'Please sign in to your trade account.' })
  event.node.res.setHeader('Cache-Control', 'private, no-store')
  const r = await cartCall(event, action, body)
  const reply = decideAccountReply(r.status, r.data)
  if (!reply.ok) throw createError({ statusCode: reply.status, statusMessage: reply.message, data: { code: reply.code ?? null } })
  return r.data
}
