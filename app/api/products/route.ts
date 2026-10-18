import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/authz";
import { buildProductInsert, validateProduct, conditionColumnMissing, conditionColumnStatus, requestedCondition } from "@/lib/vendorProduct";
import { categoryDbValues, normalizeCategory } from "@/lib/products";
import type { Category } from "@/lib/types";

// GET /api/products — public
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");

  let query = supabase
    .from("products")
    .select("*, discounts(*)")
    .order("created_at", { ascending: false });

  if (category) {
    const normalized = normalizeCategory(category);
    query = query.in("category", categoryDbValues(normalized as Category));
  }
  if (featured === "true") query = query.eq("featured", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], {
    headers: {
      // Public catalogue: let Vercel's edge cache answer repeat page loads so
      // they don't each invoke this function. Cache keys include the query
      // string, so ?category=… and ?featured=… cache separately, and the admin
      // panel appends a ?cb= cache-buster whenever it needs a fresh list.
      // Only safe because products are publicly readable (anon SELECT).
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    },
  });
}

// POST /api/products — owner or vendor (vendors create their own products)
export async function POST(request: NextRequest) {
  const caller = await getCaller();
  if (!caller.isOwner && !caller.isVendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const invalid = validateProduct(body, caller.isVendor);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // A label is being set: make sure the column exists first, so we never save
  // the product and silently drop the label.
  if (requestedCondition(body) !== null) {
    const status = await conditionColumnStatus();
    if (status === "missing") {
      return NextResponse.json(
        { error: "Run supabase/product-condition.sql in the Supabase SQL Editor to enable NEW / Thrift labels." },
        { status: 503 }
      );
    }
    if (status === "error") {
      return NextResponse.json({ error: "Could not save the product. Try again." }, { status: 500 });
    }
  }

  // If the condition migration hasn't run yet, retry without the column so
  // saves keep working (the label simply won't persist until then).
  const insert = buildProductInsert(caller, body);
  let { data, error } = await getAdminDb().from("products").insert(insert).select().single();
  if (error && conditionColumnMissing(error)) {
    const fallback = { ...insert };
    delete fallback.product_condition;
    ({ data, error } = await getAdminDb().from("products").insert(fallback).select().single());
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
  return NextResponse.json(data, { status: 201 });
}
