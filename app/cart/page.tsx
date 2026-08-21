"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, MessageCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/products";

export default function CartPage() {
  const { state, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { items } = state;

  const whatsappLines = items
    .map(
      (item) =>
        `• ${item.product.name} (${item.selectedSize}, ${item.selectedColor}) x${item.quantity} — ${formatPrice(
          item.product.price * item.quantity
        )}`
    )
    .join("%0A");

  const whatsappMessage =
    encodeURIComponent(`Hello, I'd like to place an order`) +
    (items.length > 0
      ? `:%0A%0A${whatsappLines}%0A%0A*Total: ${formatPrice(cartTotal)}*`
      : "");
  const whatsappUrl = `https://wa.me/2348000000000?text=${whatsappMessage}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/shop"
          className="p-2 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label="Back to shop"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--gold-primary)" }}
          >
            ✦ Review
          </p>
          <h1
            className="text-3xl font-black"
            style={{ color: "var(--text-primary)" }}
          >
            Your Cart
          </h1>
        </div>
      </div>

      <hr className="gold-divider mb-8" />

      {items.length === 0 ? (
        /* Empty state */
        <div className="py-24 flex flex-col items-center text-center gap-5">
          <ShoppingBag
            className="w-20 h-20 opacity-20"
            style={{ color: "var(--gold-primary)" }}
          />
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Your cart is empty
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            Browse our collection and add something you love.
          </p>
          <Link
            href="/shop"
            className="btn-gold px-8 py-3 rounded-full font-bold text-sm"
          >
            Browse Shop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                className="luxury-card flex gap-4 p-4"
              >
                {/* Image */}
                <Link
                  href={`/product/${item.product.id}`}
                  className="relative rounded-xl overflow-hidden flex-shrink-0 w-24 h-24"
                >
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    sizes="96px"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/product/${item.product.id}`}>
                        <h3
                          className="font-bold text-sm leading-tight hover:text-[var(--gold-primary)] transition-colors"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.product.name}
                        </h3>
                      </Link>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Size: {item.selectedSize} · Color: {item.selectedColor}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        removeFromCart(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor
                        )
                      }
                      className="p-1.5 rounded-lg hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      style={{ color: "var(--text-muted)" }}
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Price & Qty */}
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-base font-black gold-text">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                    <div className="flex items-center gap-2 rounded-full border px-3 py-1" style={{ borderColor: "var(--border-color)" }}>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.selectedSize,
                            item.selectedColor,
                            item.quantity - 1
                          )
                        }
                        className="w-5 h-5 flex items-center justify-center font-bold text-sm hover:text-[var(--gold-primary)] transition-colors"
                        style={{ color: "var(--text-secondary)" }}
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
                        className="w-5 h-5 flex items-center justify-center font-bold text-sm hover:text-[var(--gold-primary)] transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Clear cart */}
            <button
              onClick={clearCart}
              className="text-xs font-semibold hover:text-red-500 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Clear all items
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div
              className="luxury-card p-6 sticky top-24"
            >
              <h2
                className="text-lg font-black mb-5"
                style={{ color: "var(--text-primary)" }}
              >
                Order Summary
              </h2>

              <div className="space-y-3 mb-5">
                {items.map((item) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                    className="flex justify-between text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span className="truncate mr-2">
                      {item.product.name} ×{item.quantity}
                    </span>
                    <span className="flex-shrink-0">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <hr style={{ borderColor: "var(--border-color)" }} className="mb-4" />

              <div className="flex items-center justify-between mb-6">
                <span
                  className="font-bold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Total
                </span>
                <span className="text-2xl font-black gold-text">
                  {formatPrice(cartTotal)}
                </span>
              </div>

              {/* WhatsApp checkout */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-bold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg mb-3"
                style={{ background: "#25D366", color: "white" }}
              >
                <MessageCircle className="w-5 h-5" />
                Order via WhatsApp
              </a>

              <p
                className="text-center text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                Tap above to send your order directly to our WhatsApp. Delivery
                within FUNAAB campus.
              </p>

              {/* Continue shopping */}
              <Link
                href="/shop"
                className="mt-4 block text-center text-xs font-semibold hover:text-[var(--gold-primary)] transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
