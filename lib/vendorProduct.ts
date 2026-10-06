// Server-only helpers that turn a request body into a safe product write.
// Vendors can never set their own vendor_id, price, markup, or featured flag.
import { OWNER_MARKUP, storePrice } from "@/lib/vendor";
import type { Caller } from "@/lib/authz";
import type { Database } from "@/lib/supabase/types";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

interface ProductRow {
  vendor_id: string | null;
  vendor_price: number | null;
  markup: number;
}

const COMMON_TEXT = ["name", "description", "category", "image"] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Required-field check shared by owner and vendor writes. */
export function validateProduct(body: Record<string, unknown>, isVendor: boolean): string | null {
  if (!text(body.name).trim()) return "Name is required.";
  if (!text(body.image).trim()) return "Image is required.";
  if (!text(body.category).trim()) return "Category is required.";
  if (stringList(body.sizes).length === 0) return "Select at least one size.";
  if (stringList(body.colors).length === 0) return "Select at least one color.";
  const price = isVendor ? numberOr(body.vendor_price, 0) : numberOr(body.price, 0);
  if (price <= 0) return isVendor ? "Your price must be greater than 0." : "Price must be greater than 0.";
  return null;
}

/** Validates only the fields present in a partial update. */
export function validateProductPatch(body: Record<string, unknown>, isVendor: boolean): string | null {
  if ("name" in body && !text(body.name).trim()) return "Name cannot be empty.";
  if ("image" in body && !text(body.image).trim()) return "Image cannot be empty.";
  if ("category" in body && !text(body.category).trim()) return "Category cannot be empty.";
  if ("sizes" in body && stringList(body.sizes).length === 0) return "Select at least one size.";
  if ("colors" in body && stringList(body.colors).length === 0) return "Select at least one color.";
  if (isVendor && "vendor_price" in body && numberOr(body.vendor_price, 0) <= 0) {
    return "Your price must be greater than 0.";
  }
  if (!isVendor && "price" in body && numberOr(body.price, 0) <= 0) {
    return "Price must be greater than 0.";
  }
  return null;
}

/** Builds an insert row. Vendor identity, price and markup are set here only. */
export function buildProductInsert(caller: Caller, body: Record<string, unknown>): ProductInsert {
  const base = {
    name: text(body.name).trim(),
    description: text(body.description),
    category: text(body.category),
    image: text(body.image),
    sizes: stringList(body.sizes),
    colors: stringList(body.colors),
    in_stock: body.in_stock === undefined ? true : Boolean(body.in_stock),
  };

  if (caller.isVendor && caller.user) {
    const vendorPrice = numberOr(body.vendor_price, 0);
    return {
      ...base,
      vendor_id: caller.user.id,
      vendor_price: vendorPrice,
      markup: OWNER_MARKUP,
      price: storePrice(vendorPrice),
      // Vendors cannot feature their own products; that is the owner's call.
      featured: false,
    };
  }

  // Owner products stay store-owned. The vendor columns are omitted so this
  // keeps working even before the vendors migration is applied (DB defaults).
  return {
    ...base,
    price: numberOr(body.price, 0),
    featured: Boolean(body.featured),
  };
}

/** Builds an update patch, re-deriving price from vendor_price for vendor rows. */
export function buildProductUpdate(caller: Caller, body: Record<string, unknown>, existing: ProductRow): ProductUpdate {
  const patch: Record<string, unknown> = {};

  const textFields = caller.isVendor ? COMMON_TEXT : ([...COMMON_TEXT, "featured"] as const);
  for (const field of textFields) {
    if (!(field in body)) continue;
    if (field === "featured") patch.featured = Boolean(body.featured);
    else patch[field] = text(body[field]);
  }
  if ("sizes" in body) patch.sizes = stringList(body.sizes);
  if ("colors" in body) patch.colors = stringList(body.colors);
  if ("in_stock" in body) patch.in_stock = Boolean(body.in_stock);

  if (caller.isVendor && caller.user) {
    const vendorPrice = "vendor_price" in body ? numberOr(body.vendor_price, 0) : existing.vendor_price ?? 0;
    patch.vendor_id = caller.user.id;
    patch.vendor_price = vendorPrice;
    patch.markup = OWNER_MARKUP;
    patch.price = storePrice(vendorPrice);
    patch.featured = false;
    return patch;
  }

  // Owner editing a vendor's product keeps the vendor-pricing rule intact.
  // (A store-owned product never gets vendor columns.)
  if (existing.vendor_id) {
    const vendorPrice = "vendor_price" in body ? numberOr(body.vendor_price, 0) : existing.vendor_price ?? 0;
    const markup = "markup" in body ? numberOr(body.markup, existing.markup) : existing.markup;
    patch.vendor_price = vendorPrice;
    patch.markup = markup;
    patch.price = Number((vendorPrice + markup).toFixed(2));
  } else if ("price" in body) {
    patch.price = numberOr(body.price, 0);
  }

  return patch;
}
