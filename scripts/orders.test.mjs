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

function loadModule(file, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  });
  const testModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: testModule, exports: testModule.exports,
    require: (name) => (name in mocks ? mocks[name] : loadDependency(name)),
    process, TextDecoder, URL, console, ...globals,
  }, { filename: file });
  return testModule.exports;
}

const OWNER = { user: { id: "00000000-0000-4000-8000-000000000001", email: "theyungace3@gmail.com" }, isOwner: true, isVendor: false, role: "admin" };
const VENDOR = { user: { id: "00000000-0000-4000-8000-00000000000a", email: "v@shop.com" }, isOwner: false, isVendor: true, role: "vendor" };
const CUSTOMER = { user: { id: "00000000-0000-4000-8000-0000000000ba", email: "c@shop.com" }, isOwner: false, isVendor: false, role: "customer" };

const P_TEE = "00000000-0000-4000-8000-00000000a111";
const P_CAP = "00000000-0000-4000-8000-00000000a222";
const P_OFF = "00000000-0000-4000-8000-00000000a333";

const catalog = [
  { id: P_TEE, name: "Campus Tee", price: 4000, in_stock: true, vendor_id: VENDOR.user.id },
  { id: P_CAP, name: "Gold Cap", price: 2500, in_stock: true, vendor_id: null },
  { id: P_OFF, name: "Old Tee", price: 4000, in_stock: false, vendor_id: null },
];

// ── Fake Supabase admin client for the orders route ────────
function ordersDb({ existingOrder = null, insertError = null } = {}) {
  const calls = { inserts: [], orderUpdates: [], productUpdates: [], lookups: [] };
  const client = {
    from(table) {
      if (table === "products") {
        return {
          select: (cols) => ({
            in: async (_col, ids) => {
              calls.lookups.push({ cols, ids });
              return { data: catalog.filter((p) => ids.includes(p.id)), error: null };
            },
          }),
          update: (patch) => ({
            in: async (_col, ids) => {
              calls.productUpdates.push({ patch, ids });
              return { data: null, error: insertError };
            },
          }),
        };
      }
      if (table === "orders") {
        return {
          insert: (row) => ({
            select: () => ({
              single: async () => {
                calls.inserts.push(row);
                if (insertError) return { data: null, error: insertError };
                return { data: { id: "ord-1", order_code: row.order_code, total: row.total, items: row.items }, error: null };
              },
            }),
          }),
          select: (cols) => {
            // eq() returns an awaitable that also supports .maybeSingle().
            const eq = (col, val) => {
              calls.lookups.push({ col, val, cols });
              const found = (val === existingOrder?.id || val === existingOrder?.order_code) ? existingOrder : null;
              return {
                maybeSingle: async () => ({ data: found, error: null }),
                then: (resolve) => Promise.resolve({ data: found, error: null }).then(resolve),
              };
            };
            return { eq };
          },
          update: (patch) => ({
            eq: (col, val) => ({
              select: () => ({
                single: async () => {
                  calls.orderUpdates.push({ patch, col, val });
                  if (!existingOrder) return { data: null, error: { message: "not found" } };
                  return { data: { ...existingOrder, ...patch }, error: null };
                },
              }),
            }),
          }),
        };
      }
      throw new Error("unexpected table " + table);
    },
  };
  return { client, calls };
}

function ordersRoute(db, { user = null } = {}) {
  return loadModule("app/api/orders/route.ts", {
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    "@/lib/supabase/admin": { getAdminDb: () => db.client },
    "@/lib/authz": { getCaller: async () => (user?.email === OWNER.user.email ? OWNER : user ? CUSTOMER : { user: null, isOwner: false, isVendor: false, role: "customer" }) },
  });
}

function json(method, body, headers = {}) {
  return new NextRequest("https://shop.test/api/orders", {
    method, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
  });
}

const cartPayload = {
  items: [
    { product_id: P_TEE, quantity: 2, size: "M", color: "Black" },
    { product_id: P_CAP, quantity: 1, size: "One Size", color: "Gold" },
  ],
};

// ── POST: order creation ───────────────────────────────────
test("POST /api/orders: guests get an order, server prices it, and the code is SOC-XXXXXX", async () => {
  const db = ordersDb();
  const route = ordersRoute(db);
  const response = await route.POST(json("POST", cartPayload));
  assert.equal(response.status, 201);
  const order = await response.json();
  assert.match(order.order_code, /^SOC-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(order.total, 4000 * 2 + 2500);
  assert.equal(db.calls.inserts.length, 1);
  assert.equal(db.calls.inserts[0].user_id, null);
  assert.equal(db.calls.inserts[0].status, "pending");
  assert.equal(db.calls.inserts[0].items.length, 2);
  // Server names/prices are stored, never client-supplied ones.
  assert.equal(db.calls.inserts[0].items[0].name, "Campus Tee");
  assert.equal(db.calls.inserts[0].items[0].price, 4000);
});

test("POST /api/orders: signed-in buyers keep their user id", async () => {
  const db = ordersDb();
  const route = ordersRoute(db, { user: { id: CUSTOMER.user.id, email: CUSTOMER.user.email } });
  const response = await route.POST(json("POST", { items: [{ product_id: P_CAP, quantity: 1, size: "One Size", color: "Gold" }] }));
  assert.equal(response.status, 201);
  assert.equal(db.calls.inserts[0].user_id, CUSTOMER.user.id);
});

test("POST /api/orders: rejects bad shapes, forged prices, unknown and out-of-stock products", async () => {
  const db = ordersDb();
  const route = ordersRoute(db);
  const forged = (item) => ({ ...item, price: 1, name: "Fake" });
  const bad = [
    {},
    { items: [] },
    { items: [forged({ product_id: "not-a-uuid", quantity: 1, size: "M", color: "Black" })] },
    { items: [forged({ product_id: P_TEE, quantity: 0, size: "M", color: "Black" })] },
    { items: [forged({ product_id: P_TEE, quantity: 1.5, size: "M", color: "Black" })] },
    { items: [forged({ product_id: "00000000-0000-4000-8000-00000000ffff", quantity: 1, size: "M", color: "Black" })] },
    { items: [forged({ product_id: P_OFF, quantity: 1, size: "M", color: "Black" })] },
  ];
  const statuses = [];
  for (const body of bad) {
    statuses.push((await route.POST(json("POST", body))).status);
  }
  assert.ok(statuses.every((status) => status === 400), statuses.join(","));

  // Forged client prices are ignored: a valid cart prices from the database.
  const forgedCart = await route.POST(json("POST", { items: [forged({ product_id: P_TEE, quantity: 2, size: "M", color: "Black" })] }));
  assert.equal(forgedCart.status, 201);
  assert.equal((await forgedCart.json()).total, 8000);
  assert.equal(db.calls.inserts[0].items[0].price, 4000);
});

test("POST /api/orders: unique-code collision retries until the insert succeeds", async () => {
  const db = ordersDb({ insertError: { code: "23505" } });
  // 23505 on every attempt — the route must try a new code each time, then fail cleanly.
  const route = ordersRoute(db);
  const response = await route.POST(json("POST", { items: [{ product_id: P_TEE, quantity: 1, size: "M", color: "Black" }] }));
  assert.equal(response.status, 500);
  assert.ok(db.calls.inserts.length >= 2);
  assert.equal(new Set(db.calls.inserts.map((row) => row.order_code)).size, db.calls.inserts.length);
});

test("POST /api/orders: a missing migration returns the SQL hint", async () => {
  const db = ordersDb({ insertError: { code: "42703", message: 'column "order_code" does not exist' } });
  const route = ordersRoute(db);
  const response = await route.POST(json("POST", { items: [{ product_id: P_TEE, quantity: 1, size: "M", color: "Black" }] }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /supabase\/orders\.sql/);
});

// ── PATCH: marking paid ────────────────────────────────────
test("PATCH /api/orders: owner-only, marks paid, and takes the products out of stock", async () => {
  const order = { id: "00000000-0000-4000-8000-00000000beef", order_code: "SOC-ABC123", status: "pending", items: [{ product_id: P_TEE }, { product_id: P_CAP }] };
  const db = ordersDb({ existingOrder: order });
  const route = ordersRoute(db, { user: OWNER.user });

  const denied = ordersRoute(db, { user: CUSTOMER.user });
  assert.equal((await denied.PATCH(json("PATCH", { id: order.id }))).status, 403);
  const guest = ordersRoute(db);
  assert.equal((await guest.PATCH(json("PATCH", { id: order.id }))).status, 403);

  const response = await route.PATCH(json("PATCH", { id: order.id, action: "mark_paid" }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.order.status, "paid");
  assert.equal(body.order.paid_at !== undefined, true);
  assert.equal(body.alreadyPaid, false);
  assert.equal(db.calls.orderUpdates.length, 1);
  assert.equal(db.calls.orderUpdates[0].patch.status, "paid");
  // The ids patch array is built inside the VM module, so compare spread copies.
  assert.equal(db.calls.productUpdates.length, 1);
  assert.deepEqual({ ...db.calls.productUpdates[0].patch }, { in_stock: false, sold: true });
  assert.deepEqual([...db.calls.productUpdates[0].ids], [P_TEE, P_CAP]);
});

test("PATCH /api/orders: order-code lookup, idempotent replay, validation, 404s", async () => {
  const order = { id: "00000000-0000-4000-8000-00000000beef", order_code: "SOC-ABC123", status: "paid", items: [{ product_id: P_TEE }] };
  const db = ordersDb({ existingOrder: order });

  // Paste the code from the WhatsApp message — case-insensitive.
  const route = ordersRoute(db, { user: OWNER.user });
  const ok = await route.PATCH(json("PATCH", { order_code: "soc-abc123" }));
  assert.equal(ok.status, 200);
  assert.equal(db.calls.orderUpdates.length, 0); // already paid: no writes

  const bad = [
    { action: "delete_order" },
    {},
    { order_code: "NOPE12" },
    { id: "short" },
    { order_code: "SOC-ABC12" },
    { id: "00000000-0000-4000-8000-00000000zzzz" },
  ];
  for (const body of bad) {
    assert.equal((await route.PATCH(json("PATCH", body))).status, 400, JSON.stringify(body));
  }

  const missing = ordersDb({ existingOrder: null });
  const missRoute = ordersRoute(missing, { user: OWNER.user });
  assert.equal((await missRoute.PATCH(json("PATCH", { order_code: "SOC-ABC123" }))).status, 404);
  assert.equal((await missRoute.PATCH(json("PATCH", { id: "00000000-0000-4000-8000-000000000001" }))).status, 404);
});

// ── lib/checkout ───────────────────────────────────────────
test("lib/checkout: the WhatsApp message leads with the Order ID and the server total", () => {
  const checkout = loadModule("lib/checkout.ts", {
    "@/lib/supabase/types": {},
    "@/lib/whatsapp": { waOrderUrl: (m) => `https://wa.me/1?text=${encodeURIComponent(m)}`, WA_ORDER_MESSAGE: "Hello, I'd like to place an order" },
    "@/lib/products": { formatPrice: (n) => `NGN${n}` },
  });
  const order = {
    id: "ord-1", order_code: "SOC-K3M9Q2", total: 41000,
    items: [ { product_id: P_TEE, name: "Campus Tee", price: 4000, quantity: 2, size: "M", color: "Black" } ],
  };
  const message = checkout.buildWhatsAppMessage(order);
  assert.match(message, /\*Order ID: SOC-K3M9Q2\*/);
  assert.match(message, /Campus Tee \(M, Black\) x2 · NGN8000/);
  assert.match(message, /\*Total: NGN41000\*/);
  assert.match(checkout.orderWhatsAppUrl(order), /Order%20ID/);
});

// ── UI wiring ──────────────────────────────────────────────
test("every checkout surface creates an order whose ID goes into the WhatsApp message", () => {
  const files = ["app/cart/page.tsx", "components/CartDrawer.tsx", "components/ProductCard.tsx", "app/product/[id]/ProductDetailClient.tsx"];
  for (const file of files) {
    const source = readFileSync(path.join(root, file), "utf8");
    assert.match(source, /createOrder\(/, file + " creates the order first");
    assert.match(source, /orderWhatsAppUrl\(order\)/, file + " sends the Order ID");
    assert.match(source, /data-analytics-checkout="true"/, file + " still fires the checkout event");
  }
});

test("admin orders dashboard pastes the ID, marks paid, and tags vendors", () => {
  const admin = readFileSync(path.join(root, "app/admin/AdminClient.tsx"), "utf8");
  assert.match(admin, /id="order-lookup"/);
  assert.match(admin, /Mark paid/);
  assert.match(admin, /api\/orders/);
  assert.match(admin, /markingPaid/);
  assert.match(admin, /vendorLabel\(product\?\.vendor_id \?\? null\)/);
  assert.match(admin, /"orders"/);

  const vendor = readFileSync(path.join(root, "app/vendor/VendorClient.tsx"), "utf8");
  assert.match(vendor, /Sold — contact admin/);
  assert.match(vendor, /p\.sold/);
});

test("orders migration covers codes, paid status, and the sold flag", () => {
  const sql = readFileSync(path.join(root, "supabase/orders.sql"), "utf8");
  assert.match(sql, /order_code/);
  assert.match(sql, /paid_at/);
  assert.match(sql, /'paid'/);
  assert.match(sql, /sold boolean not null default false/);
  assert.match(sql, /orders_order_code_key/);
  assert.match(sql, /update public\.orders set order_code = code/);
});
