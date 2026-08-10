import { defineEventHandler } from 'h3'

// Called by Stratum after a page is published.
// Clears the Nitro route cache for the affected page so the next visitor
// gets the freshly published layout immediately.
//
// readBody() from h3 v2 calls event.req.text() — a Web Fetch API method not
// available on the Node.js IncomingMessage passed by Nitro's Node adapter.
// Read the raw POST body from event.node.req directly instead.
export default defineEventHandler(async (event) => {
  const raw = await new Promise<string>((resolve, reject) => {
    let buf = ''
    event.node.req.on('data', (chunk: Buffer) => { buf += chunk.toString() })
    event.node.req.on('end', () => resolve(buf))
    event.node.req.on('error', reject)
  })

  let tenantId: number | undefined
  let pageSlug: string | undefined
  try {
    const body = JSON.parse(raw) as { tenantId: number; pageSlug: string }
    tenantId = body.tenantId
    pageSlug = body.pageSlug
  } catch {
    return { invalidated: false, error: 'Invalid JSON body' }
  }

  if (!tenantId || !pageSlug) {
    return { invalidated: false, error: 'tenantId and pageSlug required' }
  }

  const storage = useStorage('cache')
  const cacheKey = `nitro:routes:/${pageSlug}:${tenantId}.json`

  await storage.removeItem(cacheKey).catch(() => null)

  return { invalidated: true }
})
