import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";

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

  if (category) query = query.eq("category", category);
  if (featured === "true") query = query.eq("featured", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/products — admin only
export async function POST(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { data, error } = await getAdminDb()
    .from("products")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
