"use client";

import { startTransition, useEffect, useState } from "react";
import {
  Activity, AlertCircle, ArrowUpRight, Eye, MessageCircle,
  MousePointerClick, Pause, Play, RefreshCw, ShoppingCart, UserPlus, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AnalyticsSummary, RecentEvent } from "@/lib/supabase/types";

const number = new Intl.NumberFormat("en-NG");
const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });
const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
});
const eventLabels: Record<RecentEvent["type"], string> = {
  pageview: "Page viewed",
  add_to_cart: "Added to cart",
  checkout_start: "Checkout clicked",
  whatsapp_click: "WhatsApp contact clicked",
};

function timeAgo(timestamp: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1_000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

export function AdminAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<{ message: string; setup: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<"connecting" | "live" | "polling">("connecting");
  const [paused, setPaused] = useState(false);
  const [reload, setReload] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const clock = setInterval(() => {
      if (document.visibilityState === "visible") setNow(Date.now());
    }, 5_000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (paused) return;
    let disposed = false;
    let inFlight = false;
    let pending = false;
    let controller: AbortController | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let lastRealtimeAt = 0;

    async function refresh() {
      if (disposed) return;
      if (inFlight) { pending = true; return; }
      inFlight = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10_000);
      try {
        const response = await fetch("/api/analytics", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (disposed) return;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) setSummary(null);
          setError({
            message: typeof data.error === "string" ? data.error : "Could not load analytics. Please retry.",
            setup: data.code === "ANALYTICS_SETUP_REQUIRED",
          });
          return;
        }
        if (data.schemaVersion !== 1) throw new Error("Unexpected analytics response");
        const receivedAt = Date.now();
        startTransition(() => {
          setSummary(data as AnalyticsSummary);
          setUpdatedAt(receivedAt);
          setNow(receivedAt);
          setError(null);
        });
      } catch {
        if (!disposed) setError({ message: "Could not refresh analytics. Check your connection and retry.", setup: false });
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        if (!disposed) {
          setLoading(false);
          if (pending) { pending = false; scheduleRefresh(); }
        }
      }
    }

    // Coalesce bursts and cap realtime-driven refetches so high-volume inserts
    // (pageviews, heartbeats) cannot turn the 20s backup poll into a 1 Hz loop.
    const REALTIME_MIN_GAP_MS = 10_000;
    function scheduleRefresh(payload?: unknown) {
      if ((payload as { new?: { type?: string } } | undefined)?.new?.type === "heartbeat") return;
      if (disposed || debounce !== undefined) return;
      const wait = Math.max(1_000, REALTIME_MIN_GAP_MS - (Date.now() - lastRealtimeAt));
      debounce = setTimeout(() => {
        debounce = undefined;
        if (document.visibilityState !== "visible") return;
        lastRealtimeAt = Date.now();
        void refresh();
      }, wait);
    }

    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }

    void refresh();
    const poll = setInterval(onVisible, 20_000);
    document.addEventListener("visibilitychange", onVisible);

    const supabase = createClient();
    const channel = supabase.channel("admin-analytics")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, scheduleRefresh)
      .subscribe((status: string) => {
        if (disposed) return;
        setConnection(status === "SUBSCRIBED" ? "live" : "polling");
        if (status === "SUBSCRIBED") scheduleRefresh();
      });

    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(poll);
      clearTimeout(debounce);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [paused, reload]);

  const status = paused ? "Paused" : error ? (summary ? "Stale data" : "Unavailable")
    : connection === "live" && summary ? "Live" : connection === "connecting" || !summary ? "Connecting" : "Auto-refresh";
  const isLive = !!summary && !paused && !error && connection === "live";
  const metrics = summary ? [
    { label: "Active now", value: summary.visitorsLive, detail: "Seen in the last 5 minutes", icon: Activity },
    { label: "Visitors today", value: summary.visitorsToday, detail: `${number.format(summary.visitors)} since tracking began`, icon: Users },
    { label: "Accounts created", value: summary.accounts, detail: `${number.format(summary.accountsToday)} today / ${number.format(summary.accounts7d)} in 7 days`, icon: UserPlus },
    { label: "Checkout visitors today", value: summary.checkoutsToday, detail: `${number.format(summary.checkouts)} unique browsers all time`, icon: ArrowUpRight },
    { label: "Checkout clicks today", value: summary.checkoutClicksToday, detail: `${number.format(summary.checkoutClicks)} clicks all time`, icon: MousePointerClick },
    { label: "WhatsApp clicks today", value: summary.whatsappToday, detail: `${number.format(summary.whatsapp)} all time, including checkout`, icon: MessageCircle },
    { label: "Page views today", value: summary.pageviewsToday, detail: `${number.format(summary.pageviews)} views all time`, icon: Eye },
    { label: "Added to cart today", value: summary.cartAddsToday, detail: `${number.format(summary.cartAdds)} add actions all time`, icon: ShoppingCart },
  ] : [];
  const activity = summary ? [
    { label: "Visited the site", value: summary.visitorsToday },
    { label: "Added to cart", value: summary.cartVisitorsToday },
    { label: "Clicked checkout", value: summary.checkoutsToday },
    { label: "Clicked any WhatsApp link", value: summary.whatsappVisitorsToday },
  ] : [];
  const chartMax = Math.max(1, ...(summary?.hourly.flatMap((bucket) => [bucket.pageviews, bucket.whatsapp]) ?? []));

  return (
    <section className="analytics-panel space-y-6" aria-labelledby="analytics-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="analytics-heading" className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Live Analytics</h2>
            <span role="status" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${isLive ? "border-emerald-600/30 text-[var(--analytics-positive)]" : "border-current text-[var(--text-secondary)]"}`}>
              <span aria-hidden="true" className={`h-2 w-2 rounded-full bg-current ${isLive ? "badge-pulse" : ""}`} />
              {status}
            </span>
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Your storefront, at a glance. Today is measured in Lagos time (WAT).
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            {updatedAt > 0 ? `Updated ${timeAgo(updatedAt, now)}. ` : ""}
            {paused ? "Automatic updates paused." : "Realtime notifications with a 20-second refresh backup."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => {
            setPaused(!paused);
            setLoading(paused);
            if (paused) setConnection("connecting");
          }} className="btn-ghost-gold inline-flex min-h-11 items-center gap-2 px-4 text-sm" aria-pressed={paused}>
            {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" disabled={loading || paused} onClick={() => {
            setLoading(true);
            setConnection("connecting");
            setReload((value) => value + 1);
          }} className="btn-ghost-gold inline-flex min-h-11 items-center gap-2 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-600/40 bg-amber-500/10 p-5" style={{ color: "var(--text-primary)" }}>
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 text-sm">
            <p className="font-bold">{error.setup ? "One-time database setup needed" : "Analytics could not update"}</p>
            <p className="mt-1 break-words">{error.message}</p>
            {summary && <p className="mt-1">The numbers below are the last successful snapshot, not current live data.</p>}
          </div>
        </div>
      )}

      {!summary ? (
        <div className="luxury-card p-10 text-center" role="status" style={{ color: "var(--text-secondary)" }}>
          <Activity className="mx-auto mb-3 h-8 w-8" aria-hidden="true" />
          <p className="font-semibold">{loading ? "Loading your storefront activity..." : paused ? "Updates are paused." : "No analytics snapshot is available yet."}</p>
          <p className="mt-2 text-sm">{paused ? "Resume to fetch the latest numbers." : "Visitor tracking starts once the analytics database is ready. Existing accounts are included automatically."}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className="luxury-card min-w-0 p-5">
                <Icon className="mb-3 h-5 w-5" style={{ color: "var(--gold-primary)" }} aria-hidden="true" />
                <p className="min-h-10 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</p>
                <p className="mt-2 break-words text-3xl font-black tabular-nums" style={{ color: "var(--text-primary)" }}>{number.format(value)}</p>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <figure className="luxury-card min-w-0 p-5 sm:p-6 lg:col-span-2">
              <figcaption>
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Storefront activity</h3>
                <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Last 24 hourly buckets, including the current hour. All times WAT.</p>
              </figcaption>
              <div className="mt-4 flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--gold-primary)" }} aria-hidden="true" />Page views</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--analytics-positive)]" aria-hidden="true" />WhatsApp clicks</span>
              </div>
              <div className="mt-6" aria-hidden="true">
                <p className="mb-2 text-right text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>Scale: 0 to {number.format(chartMax)}</p>
                <div className="grid h-44 items-end gap-1 border-b" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))", borderColor: "var(--border-color)" }}>
                  {summary.hourly.map((bucket) => (
                    <div key={bucket.bucket} className="flex h-full items-end justify-center gap-px">
                      <div className="w-1/2 rounded-t-sm" style={{ height: `${bucket.pageviews / chartMax * 100}%`, background: "var(--gold-primary)" }} />
                      <div className="w-1/2 rounded-t-sm bg-[var(--analytics-positive)]" style={{ height: `${bucket.whatsapp / chartMax * 100}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {[0, 6, 12, 18, 23].map((index) => <span key={index}>{summary.hourly[index] ? hour.format(new Date(summary.hourly[index].bucket)) : ""}</span>)}
                </div>
              </div>
              {!summary.hourly.some((bucket) => bucket.pageviews || bucket.whatsapp) && (
                <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>No page views or WhatsApp clicks in this period yet.</p>
              )}
              <details className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                <summary className="min-h-11 cursor-pointer py-3 font-semibold">View hourly data</summary>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-left text-xs tabular-nums">
                    <caption className="sr-only">Hourly page views and WhatsApp clicks in Lagos time</caption>
                    <thead><tr><th scope="col" className="py-2">Hour (WAT)</th><th scope="col" className="py-2 text-right">Page views</th><th scope="col" className="py-2 text-right">WhatsApp</th></tr></thead>
                    <tbody>{summary.hourly.map((bucket) => (
                      <tr key={bucket.bucket} className="border-t" style={{ borderColor: "var(--border-color)" }}>
                        <th scope="row" className="py-2 font-normal">{dateTime.format(new Date(bucket.bucket))}</th>
                        <td className="py-2 text-right">{number.format(bucket.pageviews)}</td>
                        <td className="py-2 text-right">{number.format(bucket.whatsapp)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </details>
            </figure>

            <div className="luxury-card min-w-0 p-5 sm:p-6">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Shopping intent</h3>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Share of today&apos;s unique visitors</p>
              <div className="mt-6 space-y-5">
                {activity.map((item) => {
                  const percentage = summary.visitorsToday ? item.value / summary.visitorsToday * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span>{item.label}</span><span className="shrink-0 font-bold tabular-nums">{number.format(item.value)} / {percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--border-color)" }} aria-hidden="true">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, percentage)}%`, background: "var(--gold-primary)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                These groups overlap. Shoppers can order straight from a product without adding it to a cart.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="luxury-card min-w-0 p-5 sm:p-6">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Top pages today</h3>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Most viewed pages, excluding the admin panel</p>
              {summary.topPages.length === 0 ? (
                <p className="mt-6 text-sm" style={{ color: "var(--text-secondary)" }}>Pages will appear as visitors browse the store.</p>
              ) : (
                <ol className="mt-5 space-y-4">
                  {summary.topPages.map((page, index) => (
                    <li key={page.path} className="flex items-start gap-3 text-sm">
                      <span className="w-5 shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>{index + 1}.</span>
                      <span className="min-w-0 flex-1 break-all font-medium" style={{ color: "var(--text-primary)" }}>{page.path}</span>
                      <span className="shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>{number.format(page.views)} views</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="luxury-card min-w-0 p-5 sm:p-6">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Recent activity</h3>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>The latest 12 actions. Presence heartbeats are hidden.</p>
              {summary.recent.length === 0 ? (
                <p className="mt-6 text-sm" style={{ color: "var(--text-secondary)" }}>Waiting for the first storefront activity.</p>
              ) : (
                <ul className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-2">
                  {summary.recent.map((event) => (
                    <li key={event.id} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--gold-primary)" }} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{eventLabels[event.type]}</p>
                        <p className="mt-0.5 break-all text-xs" style={{ color: "var(--text-secondary)" }}>{event.path}</p>
                      </div>
                      <time className="shrink-0 text-xs tabular-nums" style={{ color: "var(--text-secondary)" }} dateTime={event.created_at} title={`${dateTime.format(new Date(event.created_at))} WAT`}>
                        {timeAgo(new Date(event.created_at).getTime(), now)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-5 text-xs leading-relaxed" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
            <p><strong style={{ color: "var(--text-primary)" }}>How to read these numbers:</strong> Visitors are anonymous browsers, not verified people. Visible tabs send a presence check every minute; active visitors expire after 5 minutes without a check.</p>
            <p className="mt-2">Checkout means clicking an order link on a product or cart. Those clicks also count toward WhatsApp totals, but do not confirm that a message was sent or a sale was completed.</p>
            <p className="mt-2">Registered accounts include existing Supabase users. Database orders: <strong>{number.format(summary.orders)}</strong> total, <strong>{number.format(summary.ordersToday)}</strong> today, <strong>{number.format(summary.orders7d)}</strong> in the last 7 days. WhatsApp sales are not automatically saved as orders.</p>
          </div>
        </>
      )}
    </section>
  );
}
