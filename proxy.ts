import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const configured  = supabaseUrl.startsWith("https://") && supabaseKey.length > 20;

  // ── Not configured yet — just protect /admin ─────────────
  if (!configured) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // ── Main session refresh logic ────────────────────────────
  // Per Supabase SSR docs: create the response first, pass it
  // to setAll so cookies are written on the *same* object.
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // 1. Set on the mutated request so downstream code sees them
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // 2. Re-create the response with the updated request
        response = NextResponse.next({ request });
        // 3. Set on the response so the browser stores them
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Calling getUser() is required — it refreshes the access token
  // and triggers setAll above so cookies stay valid
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Protect /admin ────────────────────────────────────────
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
    if (!user || user.email !== adminEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, and static asset extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
