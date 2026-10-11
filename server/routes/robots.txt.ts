import { tradeState } from '~/server/utils/tradeContext'

// A closed trade portal asks search engines to stay out entirely (server/middleware/trade.ts also sends
// X-Robots-Tag: noindex on every response). Any other tenant: no robots.txt, exactly as before.
export default defineEventHandler((event) => {
  if (tradeState(event).mode === 'closed') {
    event.node.res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return 'User-agent: *\nDisallow: /\n'
  }
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
})
