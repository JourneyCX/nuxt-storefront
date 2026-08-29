import { fetchWooCredentials } from '~/server/utils/stratum'
import { getRawBody }          from '~/server/utils/http-compat'
import { setAccountSession }   from '~/server/utils/accountSession'

interface LoginBody {
  email:    string
  password: string
}

interface CustomerLoginResponse {
  id:         number
  email:      string
  first_name: string
  last_name:  string
}

// POST /api/account/login
// Calls stratum-headless's /wp-json/stratum/v1/customer-login server-to-
// server -- WC v3's admin Basic Auth (used everywhere else in this app)
// authenticates as the store's own API keys, not as an individual shopper,
// so password verification has to go through a real WordPress
// wp_authenticate() call, which only that plugin endpoint can do.
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number

  const body = await getRawBody<Partial<LoginBody>>(event)
  const email    = (body.email ?? '').trim()
  const password = body.password ?? ''

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required.' })
  }

  const creds = await fetchWooCredentials(config.stratumInternalUrl, tenantId)
  if (!creds) {
    throw createError({ statusCode: 503, statusMessage: 'WooCommerce not provisioned.' })
  }

  const result = await $fetch<CustomerLoginResponse>(
    `${creds.url.replace(/\/$/, '')}/wp-json/stratum/v1/customer-login`,
    { method: 'POST', body: { email, password } }
  ).catch(() => null)

  if (!result) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
  }

  setAccountSession(event, tenantId, result.id)

  return result
})
