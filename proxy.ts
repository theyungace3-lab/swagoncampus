import { NextResponse, type NextRequest } from "next/server";

// Minimal proxy — does NOT touch Supabase at all.
// Session is managed entirely client-side by @supabase/ssr createBrowserClient.
// Admin protection is enforced client-side in AdminClient.tsx via useAuth().
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
