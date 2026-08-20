import { getRawBody } from '~/server/utils/http-compat'

interface ContactFormBody {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
}

// Default delivery target for the Contact Form widget when the merchant
// hasn't pointed it at a third-party endpoint (Formspree, Zapier, etc.) --
// see ContactForm.vue. Forwards server-side to Stratum, which emails the
// tenant's Site Settings > Store Info contact address
// (Store_builder_api::contact_submit()).
export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const body     = await getRawBody<ContactFormBody>(event)

  const name    = body?.name?.trim()    ?? ''
  const email   = body?.email?.trim()   ?? ''
  const message = body?.message?.trim() ?? ''
  if (!name || !email || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Name, email and message are required.' })
  }

  const result = await $fetch<{ success: boolean; emailSent: boolean }>(
    `${config.stratumInternalUrl}/admin/store_builder_api/contact_submit`,
    {
      method: 'POST',
      body: {
        tenantId,
        name,
        email,
        phone:   body?.phone?.trim()   ?? '',
        subject: body?.subject?.trim() ?? '',
        message,
      },
    }
  ).catch(() => null)

  if (!result?.success) {
    throw createError({ statusCode: 502, statusMessage: 'Could not deliver your message. Please try again shortly.' })
  }
  return { success: true }
})
