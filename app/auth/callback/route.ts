import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthRedirect } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code     = searchParams.get("code");
  const destination = safeAuthRedirect(searchParams.get("redirect") ?? searchParams.get("next"));
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

  if (code && !searchParams.has("error")) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) {
        return NextResponse.redirect(new URL(destination, origin), { headers });
      }
    } catch {
      // Do not leak authorization codes or provider error details in the URL.
    }
  }

  const failed = new URL("/auth/signin", origin);
  failed.searchParams.set("error", searchParams.get("error") === "access_denied" ? "oauth_cancelled" : "auth_error");
  if (destination !== "/") failed.searchParams.set("redirect", destination);
  return NextResponse.redirect(failed, { headers });
}
