import { createWcClient, type WcAddress } from '~/server/utils/woocommerce'
import { fetchWooCredentials }            from '~/server/utils/stratum'
import { getRawBody }                     from '~/server/utils/http-compat'
import { requireAccountSession }          from '~/server/utils/accountSession'

interface AddressBody {
  billing?:  WcAddress
  shipping?: WcAddress
}

// POST /api/account/address
// Single billing + single shipping address, saved directly on the WC
// customer record (native fields) -- no address-book table, per product
// decision.
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const session  = requireAccountSession(event, tenantId)

  const body = await getRawBody<AddressBody>(event)
  if (!body.billing && !body.shipping) {
    throw createError({ statusCode: 400, statusMessage: 'billing or shipping address is required.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const client   = createWcClient(creds.url, creds.key, creds.secret)
  const customer = await client.updateCustomerAddress(session.customerId, {
    billing:  body.billing,
    shipping: body.shipping,
  }).catch((e: unknown) => {
    // e.data is the real WooCommerce response body ({code, message, data})
    // -- ofetch's FetchError default stack-trace print doesn't surface it,
    // which is why the first live failure (2026-08-29, tenant 82) still
    // wasn't diagnosable even after adding basic logging. Log it explicitly.
    const err = e as { statusCode?: number; data?: unknown }
    console.error(
      '[account/address] updateCustomerAddress failed for customer', session.customerId,
      'tenant', tenantId, 'status', err?.statusCode, 'wc response:', JSON.stringify(err?.data)
    )
    return null
  })

  if (!customer) {
    throw createError({ statusCode: 502, statusMessage: 'Could not save address.' })
  }

  return { billing: customer.billing ?? null, shipping: customer.shipping ?? null }
})
