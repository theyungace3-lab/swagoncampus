import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session on every navigation and writes the rotated
// cookies back to the response. Without this, `createServerClient` cannot
// persist a refreshed token (Server Components are not allowed to set
// cookies), so the browser and server fall out of sync and the user is
// signed out shortly after logging in.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Skip the auth round-trip entirely for anonymous visitors: with no auth
  // cookie present `getUser()` would have nothing to refresh.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasAuthCookie || !supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Must be getUser() (not getSession()): it validates the token and triggers
  // the refresh that keeps the cookie fresh.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
