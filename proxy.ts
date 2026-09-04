import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const configured  = supabaseUrl.startsWith("https://") && supabaseKey.length > 20;

  if (!configured) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // Build the response first — IMPORTANT: must pass the same response
  // object into setAll so cookies are written onto it correctly
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write onto both the request (for downstream) and the response (for browser)
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: always call getUser() — this refreshes the session token
  // and writes updated cookies. Never skip this.
  const { data: { user } } = await supabase.auth.getUser();

  // Protect /admin — redirect to sign-in if not the admin email
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
