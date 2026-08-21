import { getRawBody } from '~/server/utils/http-compat'

interface NewsletterSignupBody {
  email?: string
  firstName?: string
}

// Default delivery target for the Newsletter Signup widget when the merchant
// hasn't pointed it at their own webhook -- see NewsletterSignup.vue. Forwards
// server-side to Stratum, which adds the email to the tenant's Acelle list
// (Store_builder_api::newsletter_submit()).
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const body     = await getRawBody<NewsletterSignupBody>(event)

  const email = body?.email?.trim() ?? ''
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required.' })
  }

  const result = await $fetch<{ success: boolean; subscribed: boolean }>(
    `${config.stratumInternalUrl}/admin/store_builder_api/newsletter_submit`,
    {
      method: 'POST',
      body: {
        tenantId,
        email,
        firstName: body?.firstName?.trim() ?? '',
      },
    }
  ).catch(() => null)

  if (!result?.success) {
    throw createError({ statusCode: 502, statusMessage: 'Could not complete your signup. Please try again shortly.' })
  }
  return { success: true }
})
