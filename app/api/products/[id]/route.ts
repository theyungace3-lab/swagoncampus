import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";

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

// PATCH /api/products/:id — admin only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { data, error } = await getAdminDb()
    .from("products")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/products/:id — admin only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await getAdminDb().from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
