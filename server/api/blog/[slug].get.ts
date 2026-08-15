import { fetchBlogPost } from '~/server/utils/stratum'

export default defineEventHandler(async (event) => {
  const config   = useRuntimeConfig()
  const tenantId = event.context.tenantId as number
  const slug     = getRouterParam(event, 'slug')!

  const post = await fetchBlogPost(config.stratumInternalUrl, tenantId, slug)
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: `Post "${slug}" not found.` })
  }

  return post
})
