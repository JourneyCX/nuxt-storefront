import { handleWcPayProxy } from '~/server/utils/wcPayProxy'

// GET/POST /wc-pay/ (and /wc-pay, no path after it) -- this is the route
// PayFast's ITN notify_url actually hits (rewritten to
// "{nuxt_origin}/wc-pay/?wc-api=WC_Gateway_PayFast" in stratum-headless.php).
// Confirmed live: Nitro's [...slug] catch-all in the sibling [...slug].ts
// does NOT match when there are zero segments after "/wc-pay/", so without
// this dedicated route the real ITN POST 404'd here and the order was never
// marked paid despite PayFast's sandbox showing a successful payment.
export default defineEventHandler(handleWcPayProxy)
