import { createWcClient }        from '~/server/utils/woocommerce'
import { fetchWooCredentials }   from '~/server/utils/stratum'
import { requireAccountSession } from '~/server/utils/accountSession'

// GET /api/account/me
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const session  = requireAccountSession(event, tenantId)

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const client   = createWcClient(creds.url, creds.key, creds.secret)
  const customer = await client.getCustomer(session.customerId).catch(() => null)
  if (!customer) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found.' })
  }

  return {
    id:         customer.id,
    email:      customer.email,
    first_name: customer.first_name,
    last_name:  customer.last_name,
    billing:    customer.billing  ?? null,
    shipping:   customer.shipping ?? null,
  }
})
