import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "MISSING";
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";

  // Test actual auth with the anon key
  let authTest = "not tested";
  if (url !== "MISSING" && anon !== "MISSING") {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { "apikey": anon, "Authorization": `Bearer ${anon}` }
      });
      authTest = `HTTP ${res.status} ${res.statusText}`;
    } catch (e) {
      authTest = `fetch error: ${e}`;
    }
  }

  return NextResponse.json({
    supabaseUrl: url,
    anonKeyFirst30: anon.slice(0, 30),
    anonKeyLast10: anon.slice(-10),
    anonKeyLength: anon.length,
    serviceKeyPresent: svc !== "MISSING",
    authEndpointTest: authTest,
  });
}
