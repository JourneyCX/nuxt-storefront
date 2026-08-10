import { handleWcMediaProxy } from '~/server/utils/wcMediaProxy'

// GET /wc-media/{...path} -- proxies to {wcUrl}/wp-content/uploads/{...path}.
// See wcMediaProxy.ts for why this exists at all.
export default defineEventHandler(handleWcMediaProxy)
