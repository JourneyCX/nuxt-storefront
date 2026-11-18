// Pure helper (no Nuxt auto-imports) so it can be unit-tested with node --test.
//
// A brand-new storefront account has an EMPTY billing email on the WooCommerce
// customer, and the Saved Address form posts the saved billing details back.
// WooCommerce's REST v3 refuses `billing.email: ""` ("Invalid email address"),
// so every first save on a fresh account failed with "Could not save address."
// (found in the 2026-11-18 Founders QA). A blank email is simply not sent;
// WooCommerce then leaves the customer's email as it is. A NON-blank invalid
// email is still passed through, so WooCommerce's own validation still applies.
export function cleanBilling<T extends object>(billing: T | undefined): T | undefined {
  if (!billing) return billing
  const out = { ...billing } as Record<string, unknown>
  if ('email' in out) {
    const email = typeof out.email === 'string' ? out.email.trim() : out.email
    if (email === '' || email === null || email === undefined) delete out.email
    else out.email = email
  }
  return out as T
}
