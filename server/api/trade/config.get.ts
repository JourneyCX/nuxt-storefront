import { stratumSignedPost } from '~/server/utils/stratumSigning'

// Consent wording, upload limits and the fill-time token for the trade application form. 404 when the tenant
// does not have B2B enabled (Stratum answers 404; we pass that through so the page can say "not available").
export default defineEventHandler(async (event) => {
  const res = await stratumSignedPost<Record<string, unknown>>(event, 'config', '{}')
  if (res.status === 404) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  if (res.status !== 200 || !res.data?.success) {
    throw createError({ statusCode: 502, statusMessage: 'Trade applications are not available right now.' })
  }
  return res.data
})
