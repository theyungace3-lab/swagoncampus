import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/authz";

// GET /api/vendor/products — the signed-in vendor's own products only.
export async function GET() {
  const caller = await getCaller();
  if (!caller.isVendor || !caller.user) {
    return NextResponse.json({ error: "Vendor access required" }, { status: 403 });
  }

  const { data, error } = await getAdminDb()
    .from("products")
    .select("*")
    .eq("vendor_id", caller.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "private, no-store" } });
}
