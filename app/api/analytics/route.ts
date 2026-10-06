import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";
import { ANALYTICS_EVENT_TYPES } from "@/lib/supabase/types";
import type { AnalyticsEventType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set<string>(ANALYTICS_EVENT_TYPES);

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_BODY_BYTES = 2_048;

// Best-effort abuse guard. Serverless instances are short-lived and per-instance,
// so this is a speed bump (not a hard limit) that the service-role insert relies on
// alongside origin checks, body limits, and strict shape validation.
const RATE_WINDOW_MS = 60_000;
const MAX_EVENTS_PER_VISITOR = 60;
const MAX_EVENTS_PER_IP = 240;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(now: number, key: string, limit: number): boolean {
  if (rateBuckets.size > 5_000) {
    for (const [existingKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(existingKey);
    }
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

// Only this server endpoint can insert events; browser database writes are denied.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (origin) {
    // Hosting proxies preserve the public authority here. NextURL itself rewrites
    // loopback hosts to localhost and may describe the internal proxy connection.
    const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
      request.headers.get("host") || request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
      request.nextUrl.protocol.replace(":", "");
    try {
      if (origin !== new URL(`${protocol}://${host}`).origin) throw new Error("Origin mismatch");
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Event is too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    // Bound streamed requests too, including those without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Missing event" }, { status: 400 });
    const decoder = new TextDecoder();
    let text = "";
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "Event is too large" }, { status: 413 });
      }
      text += decoder.decode(value, { stream: true });
    }
    body = JSON.parse(text + decoder.decode());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
  const event = body as Record<string, unknown>;
  if (typeof event.type !== "string" || !ALLOWED_TYPES.has(event.type)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  if (typeof event.visitor_id !== "string" || !/^[a-zA-Z0-9_-]{8,64}$/.test(event.visitor_id)) {
    return NextResponse.json({ error: "Invalid visitor id" }, { status: 400 });
  }

  // Never retain query strings, fragments, external URLs, or admin activity.
  const path = typeof event.path === "string" ? event.path.split(/[?#]/)[0] : "/";
  if (!/^\/(?!\/)/.test(path) || path.length > 200 || /[\s\\]/.test(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (/^\/(admin|api)(\/|$)/.test(path)) {
    return new NextResponse(null, { status: 204 });
  }

  const now = Date.now();
  if (
    isRateLimited(now, `ip:${clientIp(request)}`, MAX_EVENTS_PER_IP) ||
    isRateLimited(now, `visitor:${event.visitor_id}`, MAX_EVENTS_PER_VISITOR)
  ) {
    return NextResponse.json(
      { error: "Too many events" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": "60" } }
    );
  }

  try {
    const { error } = await getAdminDb()
      .from("analytics_events")
      .insert({ type: event.type as AnalyticsEventType, visitor_id: event.visitor_id, path });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Analytics temporarily unavailable" }, { status: 503 });
  }
}

// Authenticate before using the service-role client. Never cache private totals.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to view analytics" }, { status: 401, headers: NO_STORE });
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403, headers: NO_STORE });
    }

    const { data, error } = await getAdminDb().rpc("analytics_summary");
    const needsSetup = error
      ? ["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code)
      : data?.schemaVersion !== 1;
    if (needsSetup) {
      return NextResponse.json({
        code: "ANALYTICS_SETUP_REQUIRED",
        error: "Run supabase/analytics.sql in the Supabase SQL Editor to enable analytics.",
      }, { status: 503, headers: NO_STORE });
    }
    if (error) throw error;
    return NextResponse.json(data, { headers: NO_STORE });
  } catch {
    return NextResponse.json({
      error: "Analytics is unavailable. Check the Supabase connection and server configuration, then retry.",
    }, { status: 503, headers: NO_STORE });
  }
}
