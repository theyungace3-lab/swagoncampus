// Single source for the store's WhatsApp number. Update it here only.
export const WHATSAPP_NUMBER = "2348103843353";

/** Builds a wa.me link with the message pre-encoded. */
export function waOrderUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WA_ORDER_MESSAGE = "Hello, I'd like to place an order";
