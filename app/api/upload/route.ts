import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";

const BUCKET = "product-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/upload — admin only, uploads an image to Supabase Storage
export async function POST(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Request must be multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeName = `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = getAdminDb();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(safeName, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(safeName);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
