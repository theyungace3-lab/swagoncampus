import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/authz";
import { buildProductInsert, validateProduct } from "@/lib/vendorProduct";
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
  return NextResponse.json(data ?? []);
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

  const { data, error } = await getAdminDb()
    .from("products")
    .insert(buildProductInsert(caller, body))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
