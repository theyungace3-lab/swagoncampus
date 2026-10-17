import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/authz";
import { buildProductUpdate, validateProductPatch, conditionColumnMissing } from "@/lib/vendorProduct";

// GET /api/products/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, discounts(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/products/:id — owner (any product) or the owning vendor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = await getCaller();
  if (!caller.isOwner && !caller.isVendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminDb();
  const { data: existing } = await admin
    .from("products")
    .select("vendor_id, vendor_price, markup")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // A vendor may only touch their own products.
  if (caller.isVendor && existing.vendor_id !== caller.user?.id) {
    return NextResponse.json({ error: "You can only edit your own products" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Partial updates only validate the fields being changed.
  const invalid = validateProductPatch(body, caller.isVendor);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // If the condition migration hasn't run yet, retry without the column so
  // edits keep working (the label simply won't persist until then).
  const patch = buildProductUpdate(caller, body, existing);
  let { data, error } = await admin.from("products").update(patch).eq("id", id).select().single();
  if (error && conditionColumnMissing(error)) {
    const fallback = { ...patch };
    delete fallback.product_condition;
    ({ data, error } = await admin.from("products").update(fallback).eq("id", id).select().single());
  }

  if (error) {
    if (conditionColumnMissing(error)) {
      return NextResponse.json(
        { error: "Run supabase/product-condition.sql in the Supabase SQL Editor to enable NEW / Thrift labels." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/products/:id — owner (any product) or the owning vendor
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = await getCaller();
  if (!caller.isOwner && !caller.isVendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminDb();
  const { data: existing } = await admin
    .from("products")
    .select("vendor_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (caller.isVendor && existing.vendor_id !== caller.user?.id) {
    return NextResponse.json({ error: "You can only delete your own products" }, { status: 403 });
  }

  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
