import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";

// GET /api/discounts — public (active only) or ?all=true for admin
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const all = new URL(request.url).searchParams.get("all");

  let query = supabase.from("discounts").select("*").order("created_at", { ascending: false });
  if (!all) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/discounts — admin only
export async function POST(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { data, error } = await getAdminDb().from("discounts").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/discounts — toggle active (admin only)
export async function PATCH(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, ...updates } = await request.json() as { id: string } & Record<string, unknown>;
  const { data, error } = await getAdminDb().from("discounts").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/discounts?id=xxx — admin only
export async function DELETE(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getAdminDb().from("discounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
