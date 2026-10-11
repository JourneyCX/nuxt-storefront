import { rewriteUploadsText, rewriteUploadsValue } from '~/server/utils/stratumUploads'
import type { TradeState } from '~/server/utils/tradeContext'

// B2B Session 4 (white-label): for a B2B tenant, no response body names the platform's address. Page HTML (and the
// payload embedded in it) and JSON API responses have the platform upload URLs rewritten to /sb-uploads/... on the
// merchant's own domain. A retail tenant (B2B off) is not touched.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const t = event.context.trade as TradeState | undefined
    if (!t || !t.enabled) return
    if (typeof response.body === 'string') response.body = rewriteUploadsText(response.body)
  })
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    const t = event.context.trade as TradeState | undefined
    if (!t || !t.enabled) return
    const body = response.body as unknown
    if (typeof body === 'string') {
      if ((event.path ?? '').startsWith('/api/')) response.body = rewriteUploadsText(body)
    } else if (body && typeof body === 'object' && !(body instanceof ReadableStream) && !(body as any).pipe && !(body instanceof Uint8Array)) {
      response.body = rewriteUploadsValue(body)
    }
  })
})
