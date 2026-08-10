import { handleWcPayProxy } from '~/server/utils/wcPayProxy'

// GET/POST /wc-pay/{path...}  -- see server/utils/wcPayProxy.ts for why this
// proxy exists. This route covers everything with a path segment after
// /wc-pay/ (the pay page itself, its assets, cancel processing). The bare
// /wc-pay/ path (PayFast's ITN notify_url) is handled by the sibling
// index.ts -- Nitro's [...slug] catch-all does not match a path with zero
// segments after the prefix.
export default defineEventHandler(handleWcPayProxy)
