import { handleReturnsProxy } from '~/server/utils/stratumReturnsProxy'

// GET/POST /returns/ (and /returns, no path after it) -- the sibling [...slug].ts
// catch-all does not match a path with zero segments after the prefix (same Nitro
// routing quirk documented for /wc-pay/index.ts). This covers the portal's own
// landing page (bare "returns").
export default defineEventHandler(handleReturnsProxy)
