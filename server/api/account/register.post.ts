import { createWcClient }      from '~/server/utils/woocommerce'
import { fetchWooCredentials } from '~/server/utils/stratum'
import { getRawBody }          from '~/server/utils/http-compat'
import { setAccountSession }   from '~/server/utils/accountSession'

interface RegisterBody {
  email:      string
  password:   string
  first_name: string
  last_name:  string
  accepts_marketing?: boolean
}

// POST /api/account/register
// Creates a real WooCommerce customer via the existing admin REST v3 client
// (server-side only, same credentials every other route already uses) --
// no new WordPress code needed for this half of accounts, only login needs
// stratum-headless's new /customer-login endpoint (see login.post.ts).
// Instant activation: no email verification step, per product decision --
// the session is set immediately so a fresh registration is usable right away.
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number

  const body = await getRawBody<Partial<RegisterBody>>(event)
  const email      = (body.email ?? '').trim()
  const password   = body.password ?? ''
  const first_name = (body.first_name ?? '').trim()
  const last_name  = (body.last_name ?? '').trim()

  if (!email || !password || !first_name || !last_name) {
    throw createError({ statusCode: 400, statusMessage: 'Email, password, first name and last name are required.' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const client = createWcClient(creds.url, creds.key, creds.secret)

  // accepts_marketing is stored as WC customer meta_data -- there's no CRM
  // client row to put it on yet (one is only ever created from a real order,
  // see Omni_sales_model), so the WC customer record is the durable store
  // until then. Read back and applied to tblclients.accepts_marketing the
  // moment that first client row gets created (Omni_sales_model.php).
  const customer = await client.createCustomer({
    email, password, first_name, last_name,
    accepts_marketing: body.accepts_marketing ?? false,
  }).catch((err: unknown) => {
    // WC v3 returns 400 woocommerce_rest_customer_exists for a duplicate
    // email -- surface a clean, generic message rather than the raw v3 error.
    const e = err as { statusCode?: number }
    if (e?.statusCode === 400) {
      throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists.' })
    }
    console.error('[account/register] createCustomer failed for tenant', tenantId, err)
    throw createError({ statusCode: 502, statusMessage: 'Could not create account.' })
  })

  setAccountSession(event, tenantId, customer.id)

  return { id: customer.id, email: customer.email, first_name: customer.first_name, last_name: customer.last_name }
})
