// Server-side client for the Supplier Network checkout-time stock reservation
// API (Laravel), called from server/api/cart/checkout.post.ts before the real
// WooCommerce order is created — see that file for the full flow. The
// credential is server-only, same as every other backend integration in this
// app (WooCommerce, Stratum admin API).

export interface SupplierNetworkReservation {
  reservationId: string
  expiresAt:     string
}

export interface SupplierNetworkReservationLine {
  merchantNetworkProductId: string
  productId:                number
  quantity:                 number
  expectedPriceMinor:       number
  // Both are separate varchar(64) columns on the Laravel side
  // (sn_inventory_reservations) -- kept as distinct fields here rather than
  // packed into one string and split back apart, which previously silently
  // overflowed the column (a UUID checkout-attempt id + ':' + a WC cart item
  // key routinely exceeds 64 chars) and threw a raw PDO truncation error.
  customerOrderRef:         string
  customerOrderLineRef:     string
}

// Thrown when a reservation can't be made — checkout.post.ts catches this and
// aborts BEFORE calling store.checkout(), so no WooCommerce order is ever
// created for a line the merchant can't actually fulfil. `reason` is one of
// the Laravel endpoint's own `message` values (e.g. "insufficient_stock",
// "MerchantNetworkProduct [...] price has changed...") — surfaced to the
// shopper via checkout.post.ts's own error mapping, not echoed raw.
export class SupplierNetworkReservationError extends Error {
  constructor(public readonly reason: string, public readonly productId: number) {
    super(`Supplier Network reservation failed for product ${productId}: ${reason}`)
  }
}

// Reserves one line item's stock. tenantSlug is the Laravel Tenant primary
// key (== the CI3 company slug, e.g. "colby") — NOT this app's own numeric
// tenantId, which Laravel has no concept of. See fetchWooCredentials()'s new
// `slug` field (server/utils/stratum.ts) for where this comes from.
export async function reserveSupplierNetworkStock(
  checkoutUrl:    string,
  checkoutSecret: string,
  tenantSlug:     string,
  line:           SupplierNetworkReservationLine,
): Promise<SupplierNetworkReservation> {
  if (!checkoutUrl || !checkoutSecret) {
    // Fails closed, same posture as accountSessionSecret — an unconfigured
    // reservation API must never silently let a Supplier Network line
    // through unreserved.
    throw new SupplierNetworkReservationError('supplier_network_checkout_not_configured', line.productId)
  }

  type ReservationResponse =
    | { success: true;  message: string; data: { reservation_id: string; expires_at: string } }
    | { success: false; message: string; data: null }

  let response: ReservationResponse
  try {
    response = await $fetch<ReservationResponse>(`${checkoutUrl.replace(/\/$/, '')}/api/supplier-network/checkout/reservations`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${checkoutSecret}` },
      body: {
        tenant_slug:                 tenantSlug,
        merchant_network_product_id: line.merchantNetworkProductId,
        quantity:                    line.quantity,
        expected_price_minor:        line.expectedPriceMinor,
        customer_order_ref:          line.customerOrderRef,
        customer_order_line_ref:     line.customerOrderLineRef,
      },
    })
  } catch (err: unknown) {
    // $fetch throws on any non-2xx -- the Laravel endpoint's own {success:
    // false, message} body is still available on err.data for a real reason
    // (insufficient stock, price changed, etc); a transport-level failure
    // (network, 5xx with no body) falls back to a generic reason.
    const e = err as { data?: { message?: string } }
    throw new SupplierNetworkReservationError(e?.data?.message ?? 'reservation_request_failed', line.productId)
  }

  if (!response.success) {
    throw new SupplierNetworkReservationError(response.message, line.productId)
  }

  return { reservationId: response.data.reservation_id, expiresAt: response.data.expires_at }
}
