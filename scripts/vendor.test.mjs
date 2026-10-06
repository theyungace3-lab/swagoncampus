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
    module: testModule,
    exports: testModule.exports,
    require: (name) => (name in mocks ? mocks[name] : loadDependency(name)),
    process, TextDecoder, URL, console, ...globals,
  }, { filename: file });
  return testModule.exports;
}

const vendorLib = loadModule("lib/vendor.ts");
const vendorProduct = loadModule("lib/vendorProduct.ts", { "@/lib/vendor": vendorLib });

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const VENDOR_A = { id: "00000000-0000-4000-8000-00000000000a", email: "vendor-a@shop.com" };
const VENDOR_B = { id: "00000000-0000-4000-8000-00000000000b", email: "vendor-b@shop.com" };

const owner = { user: { id: OWNER_ID, email: "theyungace3@gmail.com" }, isOwner: true, isVendor: false, role: "admin" };
const asVendor = (user) => ({ user, isOwner: false, isVendor: true, role: "vendor" });
const customer = { user: { id: "cust", email: "c@shop.com" }, isOwner: false, isVendor: false, role: "customer" };

const fullBody = {
  name: "Vendor Tee", description: "d", category: "tops", image: "https://img/x.jpg",
  sizes: ["M"], colors: ["Black"], in_stock: true,
};

function fakeAdmin({ existing = null, rows = [] } = {}) {
  const calls = { insert: [], update: [], deleted: false };
  const client = {
    from() {
      return {
        select: () => ({
          order: () => ({ eq: async () => ({ data: rows, error: null }) }),
          eq: () => ({
            order: async () => ({ data: rows, error: null }),
            maybeSingle: async () => ({ data: existing, error: null }),
          }),
        }),
        insert: (row) => ({
          select: () => ({ single: async () => { calls.insert.push(row); return { data: { id: "new", ...row }, error: null }; } }),
        }),
        update: (patch) => ({
          eq: () => ({ select: () => ({ single: async () => { calls.update.push(patch); return { data: { id: "x", ...patch }, error: null }; } }) }),
        }),
        delete: () => ({ eq: () => { calls.deleted = true; return Promise.resolve({ error: null }); } }),
      };
    },
  };
  return { client, calls };
}

function routeFor(file, caller, admin, extraMocks = {}) {
  return loadModule(file, {
    "@/lib/authz": { getCaller: async () => caller },
    "@/lib/supabase/admin": { getAdminDb: () => admin.client },
    "@/lib/supabase/server": { createClient: async () => ({ from: () => ({ select: () => ({ order: () => ({ in: () => ({ eq: async () => ({ data: [], error: null }) }) }) }) }) }) },
    "@/lib/vendorProduct": vendorProduct,
    "@/lib/products": { categoryDbValues: () => [], normalizeCategory: (x) => x },
    ...extraMocks,
  });
}

function jsonRequest(url, method, body) {
  return new NextRequest(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

// ── Pricing / tamper resistance (pure logic) ─────────────────
test("a vendor insert forces ownership, computes the store price, and drops tampered fields", () => {
  const row = vendorProduct.buildProductInsert(asVendor(VENDOR_A), {
    ...fullBody,
    vendor_price: 6000,
    price: 1, vendor_id: VENDOR_B.id, markup: 99999, featured: true,
  });
  assert.equal(row.vendor_id, VENDOR_A.id);
  assert.equal(row.vendor_price, 6000);
  assert.equal(row.markup, 500);
  assert.equal(row.price, 6500);
  assert.equal(row.featured, false);
});

test("an owner insert keeps store pricing, stays store-owned, and omits vendor columns", () => {
  const row = vendorProduct.buildProductInsert(owner, { ...fullBody, price: 7000, vendor_price: 6000, featured: true });
  assert.equal(row.vendor_id ?? null, null);
  assert.equal("vendor_id" in row, false);
  assert.equal("markup" in row, false);
  assert.equal(row.price, 7000);
  assert.equal(row.featured, true);
});

test("a vendor update recomputes price and cannot set featured or another owner", () => {
  const patch = vendorProduct.buildProductUpdate(asVendor(VENDOR_A), { vendor_price: 5000, featured: true, vendor_id: VENDOR_B.id, price: 1 }, { vendor_id: VENDOR_A.id, vendor_price: 4000, markup: 500 });
  assert.equal(patch.vendor_id, VENDOR_A.id);
  assert.equal(patch.price, 5500);
  assert.equal(patch.featured, false);
  assert.equal(patch.price === 1, false);
});

test("an owner editing a vendor product keeps the vendor-pricing rule", () => {
  const patch = vendorProduct.buildProductUpdate(owner, { vendor_price: 8000, featured: true }, { vendor_id: VENDOR_A.id, vendor_price: 4000, markup: 500 });
  assert.equal(patch.price, 8500);
  assert.equal(patch.featured, true);
});

test("validation rejects missing fields and non-positive prices for both roles", () => {
  assert.match(vendorProduct.validateProduct({ ...fullBody, vendor_price: 0 }, true), /price/i);
  assert.match(vendorProduct.validateProduct({ ...fullBody, price: 0 }, false), /price/i);
  assert.match(vendorProduct.validateProduct({ ...fullBody, price: 100, name: "  " }, false), /name/i);
  assert.equal(vendorProduct.validateProduct({ ...fullBody, vendor_price: 100 }, true), null);
  assert.match(vendorProduct.validateProductPatch({ vendor_price: 0 }, true), /price/i);
  assert.equal(vendorProduct.validateProductPatch({ in_stock: false }, true), null);
});

// ── Route-level authorization ───────────────────────────────
test("POST /api/products: vendors are scoped, customers are rejected", async () => {
  const vendorAdmin = fakeAdmin();
  const vendorRoute = routeFor("app/api/products/route.ts", asVendor(VENDOR_A), vendorAdmin);
  const response = await vendorRoute.POST(jsonRequest("https://shop.test/api/products", "POST", { ...fullBody, vendor_price: 4500, featured: true, vendor_id: VENDOR_B.id }));
  assert.equal(response.status, 201);
  assert.deepEqual(vendorAdmin.calls.insert[0].vendor_id, VENDOR_A.id);
  assert.equal(vendorAdmin.calls.insert[0].price, 5000);
  assert.equal(vendorAdmin.calls.insert[0].featured, false);

  const customerRoute = routeFor("app/api/products/route.ts", customer, fakeAdmin());
  assert.equal((await customerRoute.POST(jsonRequest("https://shop.test/api/products", "POST", { ...fullBody, price: 100 }))).status, 401);
});

test("PATCH /api/products/:id: a vendor cannot edit another vendor's product", async () => {
  const existing = { vendor_id: VENDOR_A.id, vendor_price: 4000, markup: 500 };
  const route = routeFor("app/api/products/[id]/route.ts", asVendor(VENDOR_B), fakeAdmin({ existing }));
  const response = await route.PATCH(jsonRequest("https://shop.test/api/products/1", "PATCH", { name: "Hacked" }), { params: Promise.resolve({ id: "1" }) });
  assert.equal(response.status, 403);

  const own = fakeAdmin({ existing });
  const ownRoute = routeFor("app/api/products/[id]/route.ts", asVendor(VENDOR_A), own);
  const ok = await ownRoute.PATCH(jsonRequest("https://shop.test/api/products/1", "PATCH", { vendor_price: 5000, featured: true }), { params: Promise.resolve({ id: "1" }) });
  assert.equal(ok.status, 200);
  assert.equal(own.calls.update[0].price, 5500);
  assert.equal(own.calls.update[0].featured, false);
});

test("DELETE /api/products/:id: ownership is enforced; the owner can delete anything", async () => {
  const existing = { vendor_id: VENDOR_A.id };
  assert.equal((await routeFor("app/api/products/[id]/route.ts", asVendor(VENDOR_B), fakeAdmin({ existing })).DELETE(new NextRequest("https://shop.test/api/products/1", { method: "DELETE" }), { params: Promise.resolve({ id: "1" }) })).status, 403);

  const ownAdmin = fakeAdmin({ existing });
  assert.equal((await routeFor("app/api/products/[id]/route.ts", asVendor(VENDOR_A), ownAdmin).DELETE(new NextRequest("https://shop.test/api/products/1", { method: "DELETE" }), { params: Promise.resolve({ id: "1" }) })).status, 204);
  assert.ok(ownAdmin.calls.deleted);

  const ownerAdmin = fakeAdmin({ existing });
  assert.equal((await routeFor("app/api/products/[id]/route.ts", owner, ownerAdmin).DELETE(new NextRequest("https://shop.test/api/products/1", { method: "DELETE" }), { params: Promise.resolve({ id: "1" }) })).status, 204);
  assert.ok(ownerAdmin.calls.deleted);
});

test("GET /api/vendor/products: vendor-only and never cached", async () => {
  const route = loadModule("app/api/vendor/products/route.ts", {
    "@/lib/authz": { getCaller: async () => asVendor(VENDOR_A) },
    "@/lib/supabase/admin": { getAdminDb: () => fakeAdmin({ rows: [{ id: "p1", vendor_id: VENDOR_A.id }] }).client },
  });
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");

  const denied = loadModule("app/api/vendor/products/route.ts", {
    "@/lib/authz": { getCaller: async () => customer },
    "@/lib/supabase/admin": { getAdminDb: () => fakeAdmin().client },
  });
  assert.equal((await denied.GET()).status, 403);
});

test("PATCH /api/admin/vendors: owner-only, no self-demotion, assigns roles", async () => {
  function adminMock() {
    const upserts = [];
    return {
      upserts,
      client: {
        auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }) } },
        from: () => ({
          select: async () => ({ data: [], error: null }),
          upsert: async (row) => { upserts.push(row); return { error: null }; },
        }),
      },
    };
  }
  const nonOwnerAdmin = adminMock();
  const denied = loadModule("app/api/admin/vendors/route.ts", { "@/lib/authz": { getCaller: async () => customer }, "@/lib/supabase/admin": { getAdminDb: () => nonOwnerAdmin.client } });
  assert.equal((await denied.PATCH(jsonRequest("https://shop.test/api/admin/vendors", "PATCH", { userId: VENDOR_A.id, role: "vendor" }))).status, 403);

  const ownerAdminMock = adminMock();
  const route = loadModule("app/api/admin/vendors/route.ts", { "@/lib/authz": { getCaller: async () => owner }, "@/lib/supabase/admin": { getAdminDb: () => ownerAdminMock.client } });
  assert.equal((await route.PATCH(jsonRequest("https://shop.test/api/admin/vendors", "PATCH", { userId: VENDOR_A.id, role: "vendor" }))).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(ownerAdminMock.upserts[0])), { id: VENDOR_A.id, role: "vendor" });
  assert.equal((await route.PATCH(jsonRequest("https://shop.test/api/admin/vendors", "PATCH", { userId: OWNER_ID, role: "customer" }))).status, 400);
  assert.equal((await route.PATCH(jsonRequest("https://shop.test/api/admin/vendors", "PATCH", { userId: VENDOR_A.id, role: "admin" }))).status, 400);
});
