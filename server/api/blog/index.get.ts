import { fetchBlogPosts } from '~/server/utils/stratum'
import { getRawQuery } from '~/server/utils/http-compat'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const q        = getRawQuery(event)
  const limit    = q.limit ? Number(q.limit) : undefined

  return fetchBlogPosts(config.stratumInternalUrl, tenantId, limit)
})
