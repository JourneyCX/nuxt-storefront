import { scrubAssistantText, scrubAssistantValue } from '~/server/utils/assistantScrub'

// See server/utils/assistantScrub.ts. Runs for every tenant: page HTML (and the payload inside it) and JSON API bodies.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    if (typeof response.body === 'string') response.body = scrubAssistantText(response.body)
  })
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    const body = response.body as unknown
    if (typeof body === 'string') {
      if ((event.path ?? '').startsWith('/api/')) response.body = scrubAssistantText(body)
    } else if (body && typeof body === 'object' && !(body instanceof ReadableStream) && !(body as any).pipe && !(body instanceof Uint8Array)) {
      response.body = scrubAssistantValue(body)
    }
  })
})
