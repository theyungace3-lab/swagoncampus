"use client";

import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

/**
 * Temu-style floating cart button.
 *
 * Add-to-cart is silent everywhere (no drawer popup), so the shopper keeps
 * browsing and simply taps this button when they want to review their cart.
 * Hidden on the cart page (already there) and while the drawer is open.
 */
export function FloatingCartButton() {
  const pathname = usePathname();
  const { state, cartCount, openCart } = useCart();
  const { isOpen } = state;

  if (isOpen || pathname === "/cart") return null;

  return (
    <button
      type="button"
      onClick={openCart}
      className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{
        background:
          "linear-gradient(135deg, var(--gold-primary), var(--gold-light), var(--gold-primary))",
        boxShadow:
          "0 8px 24px rgba(201, 146, 42, 0.45), 0 2px 8px rgba(0, 0, 0, 0.2)",
        color: "#1a0e00",
      }}
      aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} item${cartCount === 1 ? "" : "s"}` : ""}`}
    >
      <ShoppingCart className="w-6 h-6" />
      {cartCount > 0 && (
        <span
          key={cartCount}
          className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 text-xs font-black animate-fab-pop"
          style={{ background: "#1a0e00", color: "#fff" }}
          aria-hidden="true"
        >
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </button>
  );
}
