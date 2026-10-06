import { NextRequest, NextResponse } from "next/server";
import type { VerifyOtpParams } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeAuthRedirect } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Supabase verification links arrive as ?token_hash=&type=... whenever an
// email template still contains a link. Code-only templates never produce them.
// Anything else (e.g. an unknown type) must not attempt verification.
const LINK_OTP_TYPES = new Set(["magiclink", "signup", "recovery", "invite", "email_change", "reauthentication"]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code     = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType   = searchParams.get("type");
  const destination = safeAuthRedirect(searchParams.get("redirect") ?? searchParams.get("next"));
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const linkVerify = Boolean(tokenHash && otpType && LINK_OTP_TYPES.has(otpType));

  if ((code || linkVerify) && !searchParams.has("error")) {
    try {
      const supabase = await createClient();
      const result = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({
            type: otpType as VerifyOtpParams["type"],
            token_hash: tokenHash as string,
          });
      if (!result.error && result.data.session) {
        return NextResponse.redirect(new URL(destination, origin), { headers });
      }
    } catch {
      // Do not leak authorization codes, tokens, or provider error details in the URL.
    }
  }

  const failed = new URL("/auth/signin", origin);
  failed.searchParams.set("error", searchParams.get("error") === "access_denied" ? "oauth_cancelled" : "auth_error");
  if (destination !== "/") failed.searchParams.set("redirect", destination);
  return NextResponse.redirect(failed, { headers });
}
