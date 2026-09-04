import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy — only handles /admin protection.
 * Session management is handled entirely client-side by @supabase/ssr
 * createBrowserClient which stores tokens in cookies automatically.
 * We do NOT touch cookies here to avoid interfering with the auth flow.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept admin routes
  if (pathname.startsWith("/admin")) {
    // Check for Supabase auth cookie — any sb-* cookie means a session exists
    const hasCookie = request.cookies.getAll().some(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );

    if (!hasCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
