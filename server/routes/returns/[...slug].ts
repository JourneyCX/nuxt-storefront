import { handleReturnsProxy } from '~/server/utils/stratumReturnsProxy'

// GET/POST /returns/{path...} -- everything with a path segment after /returns/
// (lookup, request/{id}, submit/{id}, confirmation/{id}, status, check_status).
// See server/utils/stratumReturnsProxy.ts for why this proxy exists at all. The
// bare /returns/ path (the landing page) is handled by the sibling index.ts --
// Nitro's [...slug] catch-all does not match a path with zero segments after
// the prefix.
export default defineEventHandler(handleReturnsProxy)
