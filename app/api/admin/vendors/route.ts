import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/authz";

const NO_STORE = { "Cache-Control": "private, no-store" };
const ASSIGNABLE = new Set(["vendor", "customer"]);

// GET /api/admin/vendors — owner only. Lists accounts with their role and
// how many products each vendor has uploaded.
export async function GET() {
  const caller = await getCaller();
  if (!caller.isOwner) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const admin = getAdminDb();
  const [{ data: usersPage, error: usersError }, { data: profiles }, { data: products }] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("profiles").select("id, full_name, role"),
      admin.from("products").select("vendor_id").not("vendor_id", "is", null),
    ]);

  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  const roleById = new Map((profiles ?? []).map((p) => [p.id, p.role]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const counts = new Map<string, number>();
  for (const row of products ?? []) {
    if (row.vendor_id) counts.set(row.vendor_id, (counts.get(row.vendor_id) ?? 0) + 1);
  }

  const ownerEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
  const list = (usersPage?.users ?? []).map((u) => {
    const isOwner = u.email?.toLowerCase() === ownerEmail;
    return {
      id: u.id,
      email: u.email ?? "",
      fullName: nameById.get(u.id) ?? "",
      role: isOwner ? "admin" : roleById.get(u.id) ?? "customer",
      isOwner,
      productCount: counts.get(u.id) ?? 0,
      createdAt: u.created_at,
    };
  });

  return NextResponse.json(list, { headers: NO_STORE });
}

// PATCH /api/admin/vendors — owner only. Promote/demote an account.
export async function PATCH(request: NextRequest) {
  const caller = await getCaller();
  if (!caller.isOwner) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: { userId?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  const role = typeof body.role === "string" ? body.role : "";
  if (!userId || !ASSIGNABLE.has(role)) {
    return NextResponse.json({ error: "A user and a valid role are required" }, { status: 400 });
  }
  if (userId === caller.user?.id) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }

  const { error } = await getAdminDb()
    .from("profiles")
    .upsert({ id: userId, role }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, userId, role }, { headers: NO_STORE });
}
