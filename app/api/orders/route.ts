import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";

// POST /api/orders — authenticated users
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to place an order" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await getAdminDb()
    .from("orders")
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// GET /api/orders — admin sees all, user sees own
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const db = isAdmin ? getAdminDb() : supabase;
  let query = db.from("orders").select("*").order("created_at", { ascending: false });
  if (!isAdmin) query = query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
