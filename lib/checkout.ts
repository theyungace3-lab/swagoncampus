// Shared checkout helper: creates the order record first so the WhatsApp
// message always carries the Order ID the admin pastes back into the dashboard.
import type { OrderItem } from "@/lib/supabase/types";
import { formatPrice } from "@/lib/products";
import { waOrderUrl, WA_ORDER_MESSAGE } from "@/lib/whatsapp";

export interface OrderInput {
  product_id: string;
  quantity: number;
  size: string;
  color: string;
}

// What POST /api/orders returns. Prices/totals come from the server.
export interface CreatedOrder {
  id: string;
  order_code: string;
  total: number;
  items: OrderItem[];
}

export async function createOrder(items: OrderInput[]): Promise<CreatedOrder> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not create the order. Try again.");
  return data as CreatedOrder;
}

/** WhatsApp message with the Order ID the customer sends to the store. */
export function buildWhatsAppMessage(order: CreatedOrder): string {
  const lines = order.items
    .map(
      (item) =>
        `• ${item.name} (${item.size}, ${item.color}) x${item.quantity} · ${formatPrice(
          item.price * item.quantity
        )}`
    )
    .join("\n");
  return `${WA_ORDER_MESSAGE}\n\n*Order ID: ${order.order_code}*\n\n${lines}\n\n*Total: ${formatPrice(order.total)}*`;
}

export function orderWhatsAppUrl(order: CreatedOrder): string {
  return waOrderUrl(buildWhatsAppMessage(order));
}

/**
 * Opens the WhatsApp order URL. Popup blockers can reject window.open after an
 * await, so fall back to navigating this tab (never loses the order).
 */
export function openWhatsApp(url: string): void {
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) window.location.assign(url);
}
