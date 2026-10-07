import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDb } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/authz";
import type { OrderItem } from "@/lib/supabase/types";

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_ITEMS = 30;
const MAX_BODY_BYTES = 16_384;

// Order codes: SOC-XXXXXX from an unambiguous alphabet (no 0/O/1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ORDER_CODE_RE = /^SOC-[A-Z0-9]{6}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Best-effort spam guard; serverless instances are short-lived so this is a
// speed bump alongside shape validation and server-side pricing.
const RATE_WINDOW_MS = 5 * 60_000;
const MAX_ORDERS_PER_IP = 10;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(now: number, key: string, limit: number): boolean {
  if (rateBuckets.size > 2_000) {
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

function generateOrderCode(): string {
  let out = "SOC-";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

function migrationMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204" ||
    /order_code|paid_at|column .*sold/i.test(error?.message ?? "");
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE });
}

// POST /api/orders — anyone (guests included): the WhatsApp checkout creates the
// order record whose Order ID the admin later pastes back to mark it paid.
export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers: NO_STORE });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415, headers: NO_STORE });
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Order is too large" }, { status: 413, headers: NO_STORE });
  }

  const now = Date.now();
  if (isRateLimited(now, `orders:${clientIp(request)}`, MAX_ORDERS_PER_IP)) {
    return NextResponse.json(
      { error: "Too many orders. Please wait a few minutes." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": "300" } }
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Order is too large" }, { status: 413, headers: NO_STORE });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_STORE });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Invalid order");
  const items = (body as Record<string, unknown>).items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return badRequest("Order must include between 1 and 30 items");
  }

  // Validate shape; names and prices from the client are never trusted.
  const lines: { product_id: string; quantity: number; size: string; color: string }[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") return badRequest("Invalid order item");
    const item = raw as Record<string, unknown>;
    const productId = item.product_id;
    const quantity = item.quantity;
    const size = typeof item.size === "string" ? item.size.slice(0, 64) : "";
    const color = typeof item.color === "string" ? item.color.slice(0, 64) : "";
    if (typeof productId !== "string" || !UUID_RE.test(productId)) return badRequest("Invalid product");
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99) {
      return badRequest("Invalid quantity");
    }
    lines.push({ product_id: productId, quantity: quantity as number, size, color });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = getAdminDb();
  const productIds = [...new Set(lines.map((line) => line.product_id))];
  const { data: products, error: productError } = await admin
    .from("products")
    .select("id, name, price, in_stock")
    .in("id", productIds);
  if (productError) {
    return NextResponse.json({ error: "Could not verify products. Try again." }, { status: 500, headers: NO_STORE });
  }

  const byId = new Map((products ?? []).map((p: { id: string; name: string; price: number; in_stock: boolean }) => [p.id, p]));
  const orderItems: OrderItem[] = [];
  for (const line of lines) {
    const product = byId.get(line.product_id);
    if (!product) return badRequest("An item in your cart is no longer available.");
    if (!product.in_stock) return badRequest(`${product.name} is out of stock.`);
    orderItems.push({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: line.quantity,
      size: line.size,
      color: line.color,
    });
  }
  const total = Number(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));

  // Unique-code retries; a lost race is 23505 on orders_order_code_key.
  for (let attempt = 0; attempt < 4; attempt++) {
    const orderCode = generateOrderCode();
    const { data, error } = await admin
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        order_code: orderCode,
        items: orderItems,
        total,
        status: "pending",
      })
      .select("id, order_code, total, items")
      .single();

    if (!error && data) {
      return NextResponse.json(data, { status: 201, headers: NO_STORE });
    }
    if (error?.code === "23505") continue;
    if (migrationMissing(error)) {
      return NextResponse.json(
        { error: "Run supabase/orders.sql in the Supabase SQL Editor to enable order IDs." },
        { status: 503, headers: NO_STORE }
      );
    }
    return NextResponse.json({ error: "Could not create the order. Try again." }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ error: "Could not create the order. Try again." }, { status: 500, headers: NO_STORE });
}

// GET /api/orders — admin sees all, signed-in users see their own
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });

  const isAdmin = !!process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
    user.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL.trim().toLowerCase();
  const db = isAdmin ? getAdminDb() : supabase;
  let query = db.from("orders").select("*").order("created_at", { ascending: false });
  if (!isAdmin) query = query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error) {
    if (migrationMissing(error)) {
      return NextResponse.json(
        { error: "Run supabase/orders.sql in the Supabase SQL Editor to enable order IDs." },
        { status: 503, headers: NO_STORE }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json(data ?? [], { headers: NO_STORE });
}

// PATCH /api/orders — owner only: mark an order paid from the admin dashboard.
// Finds the row by the Order ID the admin pasted (or row id), sets status
// 'paid', then marks every ordered product in_stock=false + sold=true.
export async function PATCH(request: NextRequest) {
  const caller = await getCaller();
  if (!caller.isOwner) {
    return NextResponse.json({ error: "Owner access required" }, { status: 403, headers: NO_STORE });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_STORE });
  }

  const action = typeof body.action === "string" ? body.action : "mark_paid";
  if (action !== "mark_paid") return badRequest("Unsupported action");

  const orderCode = typeof body.order_code === "string" ? body.order_code.trim().toUpperCase() : "";
  const orderId = typeof body.id === "string" ? body.id : "";
  if (orderCode) {
    if (!ORDER_CODE_RE.test(orderCode)) return badRequest("Order ID must look like SOC-XXXXXX");
  } else if (orderId) {
    if (!UUID_RE.test(orderId)) return badRequest("Invalid order id");
  } else {
    return badRequest("Provide the order code or id");
  }

  const admin = getAdminDb();
  let lookup = admin.from("orders").select("id, status, items");
  lookup = orderCode ? lookup.eq("order_code", orderCode) : lookup.eq("id", orderId);
  const { data: order, error: findError } = await lookup.maybeSingle();

  if (findError && migrationMissing(findError)) {
    return NextResponse.json(
      { error: "Run supabase/orders.sql in the Supabase SQL Editor to enable order IDs." },
      { status: 503, headers: NO_STORE }
    );
  }
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404, headers: NO_STORE });
  if (order.status === "paid") {
    return NextResponse.json({ order, alreadyPaid: true }, { headers: NO_STORE });
  }

  const paidAt = new Date().toISOString();
  const { data: updated, error: payError } = await admin
    .from("orders")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", order.id)
    .select("*")
    .single();
  if (payError) {
    return NextResponse.json({ error: "Could not mark the order paid. Try again." }, { status: 500, headers: NO_STORE });
  }

  const productIds = [...new Set(
    (Array.isArray(order.items) ? order.items : [])
      .map((item: Partial<OrderItem>) => item?.product_id)
      .filter((id): id is string => typeof id === "string" && UUID_RE.test(id))
  )];
  if (productIds.length > 0) {
    const { error: stockError } = await admin
      .from("products")
      .update({ in_stock: false, sold: true })
      .in("id", productIds);
    if (stockError) {
      if (migrationMissing(stockError)) {
        return NextResponse.json(
          { error: "Run supabase/orders.sql in the Supabase SQL Editor to enable order IDs." },
          { status: 503, headers: NO_STORE }
        );
      }
      return NextResponse.json({ error: "Could not update product stock. Try again." }, { status: 500, headers: NO_STORE });
    }
  }

  return NextResponse.json({ order: updated, alreadyPaid: false }, { headers: NO_STORE });
}
