import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const configured  = supabaseUrl.startsWith("https://") && supabaseKey.length > 20;

  // If Supabase not configured yet, skip auth checks
  if (!configured) {
    // Still protect /admin with a basic redirect if not configured
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/signin";
      loginUrl.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  // Protect /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
    if (!user || user.email !== adminEmail) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/signin";
      loginUrl.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
