import { createWcClient }        from '~/server/utils/woocommerce'
import { fetchWooCredentials }   from '~/server/utils/stratum'
import { requireAccountSession } from '~/server/utils/accountSession'

export interface AccountOrderSummary {
  id:          number
  status:      string
  currency:    string
  total:       string
  dateCreated: string
  itemSummary: string // e.g. "3 items" or the single product name for a 1-item order
}

// GET /api/account/orders
// Deliberately minimal, non-PII subset -- same precedent as
// orders/[id].get.ts's OrderConfirmation. Never returns the raw v3 order
// object (billing PII, customer notes, full line items, etc.).
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const session  = requireAccountSession(event, tenantId)

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const client = createWcClient(creds.url, creds.key, creds.secret)
  const orders = await client.getOrdersByCustomer(session.customerId).catch(() => [])

  const result: AccountOrderSummary[] = orders.map(o => ({
    id:          o.id,
    status:      o.status,
    currency:    o.currency,
    total:       o.total,
    dateCreated: o.date_created,
    itemSummary: o.line_items.length === 1
      ? o.line_items[0].name
      : `${o.line_items.reduce((sum, li) => sum + li.quantity, 0)} items`,
  }))

  return result
})
