// Vendor pricing rules. Safe to import from client and server code.

/**
 * Flat profit the store adds on top of a vendor's price.
 * The customer-facing price is vendor_price + OWNER_MARKUP.
 * Only the server computes this for stored products, so a vendor cannot
 * manipulate it. Changing the constant affects future writes; existing
 * products keep the `markup` stored on their row.
 */
export const OWNER_MARKUP = 200;

export type Role = "customer" | "admin" | "vendor";

/** Customer-facing price for a vendor's price. */
export function storePrice(vendorPrice: number): number {
  return Number((vendorPrice + OWNER_MARKUP).toFixed(2));
}
