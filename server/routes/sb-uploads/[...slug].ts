import { isAllowedUploadPath, uploadsBase } from '~/server/utils/stratumUploads'

// GET /sb-uploads/{tenant slug}/{store_builder|store_blog}/... : the merchant's uploaded images, served from the
// merchant's own domain (see server/utils/stratumUploads.ts). Public media, GET only, allowlisted folders and file
// types, fetched from the platform's public address server-side.
export default defineEventHandler(async (event) => {
  const raw = (event.node.req.url ?? '').split('?')[0]
  const path = raw.replace(/^\/sb-uploads\/?/, '')
  const i = path.indexOf('/')
  const slug = i === -1 ? path : path.slice(0, i)
  const rest = i === -1 ? '' : path.slice(i + 1)
  if ((event.node.req.method ?? 'GET') !== 'GET' || !isAllowedUploadPath(slug, rest)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found.' })
  }
  // slug "_" = a legacy address with no tenant in it (https://{platform}/uploads/store_builder/tenant_N/...): same folder, read directly
  const target = slug === '_' ? `${uploadsBase()}/uploads/${rest}` : `${uploadsBase()}/${slug}/ps/uploads/${rest}`
  const upstream = await fetch(target, { redirect: 'manual' }).catch(() => null)
  if (!upstream || !upstream.ok || !upstream.body) {
    throw createError({ statusCode: upstream?.status === 404 ? 404 : 502, statusMessage: 'Not found.' })
  }
  const type = upstream.headers.get('content-type')
  if (type) event.node.res.setHeader('Content-Type', type)
  event.node.res.setHeader('Cache-Control', 'public, max-age=86400')
  return upstream.body
})
