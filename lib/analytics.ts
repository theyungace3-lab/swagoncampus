// Client-side analytics tracker. Fire-and-forget: it must never throw,
// block the UI, or break navigation.
import type { AnalyticsEventType } from "@/lib/supabase/types";

export type AnalyticsEvent = AnalyticsEventType;

const VISITOR_KEY = "soc_analytics_visitor";
let memoryVisitorId = "";
let lastHeartbeat: number | undefined;

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  if (memoryVisitorId) return memoryVisitorId;
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      memoryVisitorId = existing;
      return existing;
    }
  } catch {
    // Storage may be blocked. Keep a unique ID in memory for this page instead.
  }

  memoryVisitorId = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  try {
    window.localStorage.setItem(VISITOR_KEY, memoryVisitorId);
  } catch { /* Tracking must still work without localStorage. */ }
  return memoryVisitorId;
}

export function trackEvent(type: AnalyticsEvent, path?: string): void {
  if (typeof window === "undefined") return;

  try {
    const pathname = (path ?? window.location.pathname).split(/[?#]/)[0];
    if (/^\/(admin|api)(\/|$)/.test(pathname) || /^\/admin(\/|$)/.test(window.location.pathname)) return;

    // Throttle presence only. Every real add-to-cart or button click is counted.
    if (type === "heartbeat") {
      const now = Date.now();
      if (lastHeartbeat !== undefined && now - lastHeartbeat < 60_000) return;
      lastHeartbeat = now;
    }

    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, visitor_id: getVisitorId(), path: pathname }),
      keepalive: true,
    }).catch(() => undefined);
  } catch { /* Analytics must never interrupt shopping, even if fetch throws. */ }
}
