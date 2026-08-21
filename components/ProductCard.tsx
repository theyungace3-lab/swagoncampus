"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, MessageCircle, Heart } from "lucide-react";
import { Product } from "@/lib/types";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/products";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, openCart } = useCart();
  const [wished, setWished] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const defaultSize = product.sizes[0] ?? "One Size";
  const defaultColor = product.colors[0] ?? "Default";

  const whatsappMessage = encodeURIComponent(
    `Hello, I'd like to place an order for: *${product.name}* — ${formatPrice(product.price)}`
  );
  const whatsappUrl = `https://wa.me/2348185319037?text=${whatsappMessage}`;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, defaultSize, defaultColor);
    setAddedFeedback(true);
    openCart();
    setTimeout(() => setAddedFeedback(false), 1500);
  }

  function handleWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWished((w) => !w);
  }

  return (
    <article className="luxury-card group overflow-hidden flex flex-col">
      {/* Image */}
      <Link
        href={`/product/${product.id}`}
        className="block relative product-img-overlay"
        style={{ aspectRatio: "4/5" }}
        aria-label={`View ${product.name}`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.featured && (
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
              style={{ background: "var(--gold-primary)", color: "#1a0e00" }}
            >
              ✦ Featured
            </span>
          )}
          {!product.inStock && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-red-500 text-white">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWish}
          className="absolute top-3 right-3 p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className="w-4 h-4"
            fill={wished ? "#c9922a" : "none"}
            stroke={wished ? "#c9922a" : "currentColor"}
          />
        </button>
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category tag */}
        <span
          className="text-[10px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: "var(--gold-primary)" }}
        >
          {product.category}
        </span>

        {/* Name */}
        <Link href={`/product/${product.id}`}>
          <h3
            className="font-bold text-sm leading-tight mb-1 hover:text-[var(--gold-primary)] transition-colors line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {product.name}
          </h3>
        </Link>

        {/* Sizes preview */}
        <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
          Sizes: {product.sizes.slice(0, 4).join(", ")}
          {product.sizes.length > 4 ? " +" : ""}
        </p>

        {/* Price */}
        <p className="text-lg font-black mt-auto mb-3 gold-text">
          {formatPrice(product.price)}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-gold"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {addedFeedback ? "Added ✓" : "Add to Cart"}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 hover:scale-110 flex-shrink-0"
            style={{ background: "#25D366", color: "white" }}
            aria-label={`Order ${product.name} via WhatsApp`}
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
