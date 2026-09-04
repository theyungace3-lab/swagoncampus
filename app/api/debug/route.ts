import { NextResponse } from "next/server";

// Temporary debug route — DELETE AFTER FIXING
export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) ?? "MISSING",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20) + "..." : "MISSING",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?
      process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 20) + "..." : "MISSING",
    adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "MISSING",
  });
}
