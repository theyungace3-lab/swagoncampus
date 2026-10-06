import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest } from "next/server.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const loadDependency = createRequire(import.meta.url);
const owner = "theyungace3@gmail.com";

// Compile the real modules with only network/browser boundaries replaced.
function loadModule(file, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  });
  const testModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: testModule, exports: testModule.exports,
    require: (name) => name in mocks ? mocks[name] : loadDependency(name),
    TextDecoder, URL, console, ...globals,
  }, { filename: file });
  return testModule.exports;
}

// The route reads the runtime event-type whitelist from this module.
const typesModule = loadModule("lib/supabase/types.ts");

function api(options = {}) {
  const inserts = [];
  let adminCalls = 0;
  const handlers = loadModule("app/api/analytics/route.ts", {
    "@/lib/supabase/types": typesModule,
    "@/lib/supabase/server": {
      createClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.user ?? null }, error: options.authError }) } }),
    },
    "@/lib/supabase/admin": {
      getAdminDb: () => {
        adminCalls++;
        return {
          from: (table) => {
            assert.equal(table, "analytics_events");
            return { insert: async (row) => { inserts.push(JSON.parse(JSON.stringify(row))); return { error: options.insertError }; } };
          },
          rpc: async (name) => {
            assert.equal(name, "analytics_summary");
            return { data: options.summary ?? { schemaVersion: 1, visitors: 12 }, error: options.rpcError };
          },
        };
      },
    },
  }, { process: { env: { NEXT_PUBLIC_ADMIN_EMAIL: options.adminEmail ?? owner } } });
  return { ...handlers, inserts, adminCalls: () => adminCalls };
}

function request(body, headers = {}) {
  return new NextRequest("https://shop.example/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://shop.example", ...headers },
    body: JSON.stringify(body),
  });
}

const valid = { type: "pageview", visitor_id: "visitor-12345678", path: "/shop" };

test("ingest accepts every supported event without storing client-supplied identity or timestamps", async () => {
  const route = api();
  for (const type of ["pageview", "add_to_cart", "checkout_start", "whatsapp_click", "heartbeat"]) {
    const response = await route.POST(request({ ...valid, type, path: "/shop?email=private@example.com#token", user_id: "forged", created_at: "2000-01-01" }));
    assert.equal(response.status, 201);
    assert.deepEqual(route.inserts.at(-1), { ...valid, type });
  }
});

test("ingest rejects malformed bodies, IDs, types, paths, origins, and oversized requests", async () => {
  const route = api();
  for (const body of [null, [], "text", {}, { ...valid, type: "signup" }, { ...valid, visitor_id: "unknown" },
    { ...valid, visitor_id: "a".repeat(65) }, { ...valid, visitor_id: "name@email.com" },
    { ...valid, path: "//outside.example" }, { ...valid, path: "https://outside.example" },
    { ...valid, path: "/a b" }, { ...valid, path: "/a\\b" }, { ...valid, path: "/" + "x".repeat(200) }]) {
    assert.equal((await route.POST(request(body))).status, 400, JSON.stringify(body));
  }
  assert.equal((await route.POST(new NextRequest("https://shop.example/api/analytics", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{broken",
  }))).status, 400);
  assert.equal((await route.POST(request(valid, { origin: "https://other.example" }))).status, 403);
  assert.equal((await route.POST(request(valid, { "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await route.POST(request(valid, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await route.POST(request(valid, { "content-length": "2049" }))).status, 413);
  assert.equal((await route.POST(request({ ...valid, extra: "x".repeat(2049) }))).status, 413);
  assert.equal(route.adminCalls(), 0);
});

test("admin and API paths never enter storefront analytics", async () => {
  const route = api();
  for (const pathname of ["/admin", "/admin/products", "/api/analytics"]) {
    assert.equal((await route.POST(request({ ...valid, path: pathname }))).status, 204);
  }
  assert.equal(route.inserts.length, 0);
});

test("public ingest rate-limits abusive bursts per visitor", async () => {
  const route = api();
  const statuses = [];
  for (let index = 0; index < 70; index++) {
    statuses.push((await route.POST(request({ ...valid, path: "/shop" }))).status);
  }
  assert.equal(statuses.filter((status) => status === 201).length, 60);
  assert.equal(statuses.filter((status) => status === 429).length, 10);
  assert.equal(statuses.at(-1), 429);
});

test("same-origin ingest works through loopback addresses and trusted hosting proxies", async () => {
  const route = api();
  for (const host of ["127.0.0.1:3000", "[::1]:3000", "localhost:3000"]) {
    const response = await route.POST(new NextRequest(`http://${host}/api/analytics`, {
      method: "POST", headers: { host, origin: `http://${host}`, "content-type": "application/json" },
      body: JSON.stringify(valid),
    }));
    assert.equal(response.status, 201, host);
  }
  const headers = {
    host: "internal:3000", "x-forwarded-host": "shop.example", "x-forwarded-proto": "https",
    origin: "https://shop.example", "content-type": "application/json",
  };
  const proxied = (extra = {}) => new NextRequest("http://internal:3000/api/analytics", {
    method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(valid),
  });
  assert.equal((await route.POST(proxied())).status, 201);
  assert.equal((await route.POST(proxied({ origin: "https://outside.example" }))).status, 403);
  assert.equal((await route.POST(proxied({ "sec-fetch-site": "cross-site" }))).status, 403);
});

test("public ingest failures do not disclose database details", async () => {
  const route = api({ insertError: { message: "sensitive database detail" } });
  const response = await route.POST(request(valid));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /sensitive/);
});

test("summary authorization happens before service-role access and is never cached", async () => {
  for (const options of [{}, { user: { email: "customer@example.com" } }, { user: { email: owner }, authError: new Error("Expired") },
    { user: { email: owner }, adminEmail: " " }, { user: {} }]) {
    const route = api(options);
    const response = await route.GET();
    assert.ok([401, 403].includes(response.status));
    assert.equal(route.adminCalls(), 0);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  const route = api({ user: { email: owner.toUpperCase() }, adminEmail: ` ${owner} ` });
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).visitors, 12);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("missing or outdated migrations have a setup error; outages do not look like zero traffic", async () => {
  for (const options of [{ rpcError: { code: "PGRST202" } }, { rpcError: { code: "42P01" } }, { summary: {} }]) {
    const response = await api({ user: { email: owner }, ...options }).GET();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "ANALYTICS_SETUP_REQUIRED");
  }
  const response = await api({ user: { email: owner }, rpcError: { code: "503", message: "private failure" } }).GET();
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private failure/);
});

function tracker({ storage = new Map(), blocked = false, pathname = "/shop", fetchImpl, id = "00000000-0000-4000-8000-000000000001" } = {}) {
  const sent = [];
  let now = 100_000;
  const window = {
    location: { pathname },
    localStorage: {
      getItem: (key) => { if (blocked) throw new Error("Blocked"); return storage.get(key); },
      setItem: (key, value) => { if (blocked) throw new Error("Blocked"); storage.set(key, value); },
    },
  };
  const exported = loadModule("lib/analytics.ts", {}, {
    window, crypto: { randomUUID: () => id }, Date: { now: () => now },
    fetch: fetchImpl ?? ((url, options) => {
      assert.equal(url, "/api/analytics");
      assert.equal(options.keepalive, true);
      sent.push(JSON.parse(options.body));
      return Promise.resolve();
    }),
  });
  return { ...exported, sent, window, advance: (ms) => { now += ms; } };
}

test("visitor IDs persist across navigation/reload and have a unique storage-blocked fallback", () => {
  const storage = new Map();
  const first = tracker({ storage });
  const id = first.getVisitorId();
  assert.equal(tracker({ storage, id: "another-visitor" }).getVisitorId(), id);
  storage.set("soc_analytics_visitor", "unknown");
  assert.equal(tracker({ storage }).getVisitorId(), id);
  const blockedA = tracker({ blocked: true, id: "visitor-aaaaaaaa" });
  const blockedB = tracker({ blocked: true, id: "visitor-bbbbbbbb" });
  assert.equal(blockedA.getVisitorId(), blockedA.getVisitorId());
  assert.notEqual(blockedA.getVisitorId(), blockedB.getVisitorId());
});

test("tracker counts each real action, throttles only heartbeats, and strips URL secrets", () => {
  const client = tracker();
  for (let i = 0; i < 3; i++) client.trackEvent("add_to_cart");
  for (let i = 0; i < 2; i++) client.trackEvent("checkout_start");
  client.trackEvent("pageview", "/shop?token=private#secret");
  client.trackEvent("heartbeat");
  client.trackEvent("heartbeat");
  client.advance(60_000);
  client.trackEvent("heartbeat");
  assert.equal(client.sent.length, 8);
  assert.equal(client.sent[5].path, "/shop");
  assert.equal(new Set(client.sent.map((event) => event.visitor_id)).size, 1);
  client.window.location.pathname = "/admin";
  client.trackEvent("checkout_start", "/cart");
  assert.equal(client.sent.length, 8);
});

test("SSR, blocked storage, and sync/async fetch failures never break shopping", async () => {
  const server = loadModule("lib/analytics.ts");
  assert.equal(server.getVisitorId(), "");
  assert.doesNotThrow(() => server.trackEvent("pageview"));
  assert.doesNotThrow(() => tracker({ blocked: true }).trackEvent("pageview"));
  assert.doesNotThrow(() => tracker({ fetchImpl: () => { throw new Error("Unavailable"); } }).trackEvent("pageview"));
  assert.doesNotThrow(() => tracker({ fetchImpl: () => Promise.reject(new Error("Offline")) }).trackEvent("pageview"));
  await new Promise((resolve) => setImmediate(resolve));
});

test("provider deduplicates pageviews, pauses hidden presence, tracks nested/middle clicks, and cleans up", () => {
  const effects = [];
  const events = [];
  const listeners = new Map();
  const intervals = new Map();
  const document = {
    visibilityState: "visible",
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: (type) => listeners.delete(type),
  };
  class Element {
    constructor(anchor) { this.anchor = anchor; }
    closest() { return this.anchor; }
  }
  const { AnalyticsProvider } = loadModule("components/AnalyticsProvider.tsx", {
    react: { useEffect: (effect) => effects.push(effect), useRef: () => ({ current: null }) },
    "next/navigation": { usePathname: () => "/shop" },
    "@/lib/analytics": { trackEvent: (type, pathname) => events.push({ type, pathname }) },
  }, {
    document, Element,
    window: { setInterval: (fn) => { const id = intervals.size + 1; intervals.set(id, fn); return id; }, clearInterval: (id) => intervals.delete(id) },
  });
  AnalyticsProvider({ children: null });
  effects[0]()();
  const cleanPage = effects[0]();
  const cleanClicks = effects[1]();
  assert.equal(events.filter((event) => event.type === "pageview").length, 1);
  document.visibilityState = "hidden";
  const before = events.length;
  for (const interval of intervals.values()) interval();
  assert.equal(events.length, before);
  document.visibilityState = "visible";
  listeners.get("visibilitychange")();
  assert.equal(events.at(-1).type, "heartbeat");
  const anchor = { protocol: "https:", hostname: "wa.me", dataset: { analyticsCheckout: "true" } };
  listeners.get("click")({ type: "click", button: 0, target: new Element(anchor) });
  assert.equal(events.at(-1).type, "checkout_start");
  assert.equal(events.filter((event) => event.type === "whatsapp_click").length, 0);
  anchor.dataset = {};
  listeners.get("auxclick")({ type: "auxclick", button: 1, target: new Element(anchor) });
  assert.equal(events.at(-1).type, "whatsapp_click");
  const count = events.length;
  listeners.get("auxclick")({ type: "auxclick", button: 2, target: new Element(anchor) });
  listeners.get("click")({ type: "click", button: 0, target: {} });
  anchor.hostname = "wa.me.attacker.example";
  listeners.get("click")({ type: "click", button: 0, target: new Element(anchor) });
  assert.equal(events.length, count);
  cleanPage();
  cleanClicks();
  assert.equal(intervals.size, 0);
  assert.equal(listeners.size, 0);
});
