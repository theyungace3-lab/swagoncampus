"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Trash2, ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/products";

export function CartDrawer() {
  const { state, removeFromCart, updateQuantity, closeCart, cartTotal } = useCart();
  const { items, isOpen } = state;

  const whatsappLines = items
    .map(
      (item) =>
        `• ${item.product.name} (${item.selectedSize}, ${item.selectedColor}) x${item.quantity} — ${formatPrice(
          item.product.price * item.quantity
        )}`
    )
    .join("%0A");

  const whatsappMessage = encodeURIComponent(
    `Hello, I'd like to place an order`
  ) + (items.length > 0 ? `:%0A%0A${whatsappLines}%0A%0A*Total: ${formatPrice(cartTotal)}*` : "");

  const whatsappUrl = `https://wa.me/2348185319037?text=${whatsappMessage}`;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={closeCart}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full z-50 w-full max-w-sm flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "var(--bg-primary)",
          borderLeft: "1px solid var(--border-color)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
        }}
        aria-label="Shopping cart"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" style={{ color: "var(--gold-primary)" }} />
            <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              Your Cart
            </h2>
            {items.length > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--gold-primary)", color: "#1a0e00" }}
              >
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="p-2 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
              <ShoppingBag
                className="w-16 h-16 opacity-20"
                style={{ color: "var(--gold-primary)" }}
              />
              <p
                className="text-center text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Your cart is empty.
                <br />
                Start shopping to add items!
              </p>
              <Link
                href="/shop"
                onClick={closeCart}
                className="btn-gold px-6 py-2.5 text-sm font-bold rounded-full"
              >
                Browse Shop
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                className="flex gap-3 p-3 rounded-xl"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                {/* Image */}
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm leading-tight truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.product.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {item.selectedSize} · {item.selectedColor}
                  </p>
                  <p className="text-sm font-bold mt-1 gold-text">
                    {formatPrice(item.product.price)}
                  </p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor,
                          item.quantity - 1
                        )
                      }
                      className="w-6 h-6 rounded-full border flex items-center justify-center text-sm font-bold transition-colors hover:border-[var(--gold-primary)] hover:text-[var(--gold-primary)]"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span
                      className="text-sm font-bold w-6 text-center"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor,
                          item.quantity + 1
                        )
                      }
                      className="w-6 h-6 rounded-full border flex items-center justify-center text-sm font-bold transition-colors hover:border-[var(--gold-primary)] hover:text-[var(--gold-primary)]"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>

                    <button
                      onClick={() =>
                        removeFromCart(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor
                        )
                      }
                      className="ml-auto p-1 rounded-md hover:text-red-500 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="px-5 py-5 border-t space-y-3"
            style={{ borderColor: "var(--border-color)" }}
          >
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                Subtotal
              </span>
              <span className="text-xl font-black gold-text">{formatPrice(cartTotal)}</span>
            </div>

            {/* View Full Cart */}
            <Link
              href="/cart"
              onClick={closeCart}
              className="block w-full text-center py-3 rounded-full text-sm font-bold border transition-all duration-200 hover:bg-[rgba(201,146,42,0.08)]"
              style={{
                borderColor: "var(--gold-primary)",
                color: "var(--gold-primary)",
              }}
            >
              View Full Cart
            </Link>

            {/* WhatsApp Checkout */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-bold transition-all duration-200 hover:scale-[1.02]"
              style={{ background: "#25D366", color: "white" }}
            >
              <MessageCircle className="w-4 h-4" />
              Order via WhatsApp
            </a>
          </div>
        )}
      </aside>
    </>
  );
}
