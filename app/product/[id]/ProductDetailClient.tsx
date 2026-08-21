"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, MessageCircle, ArrowLeft, Heart, Check } from "lucide-react";
import { useProducts } from "@/contexts/ProductsContext";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/products";

export function ProductDetailClient({ id }: { id: string }) {
  const { products } = useProducts();
  const { addToCart, openCart } = useCart();

  const product = products.find((p) => p.id === id);

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [wished, setWished] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <p className="text-6xl mb-4">🛍️</p>
        <h1
          className="text-2xl font-bold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          Product not found
        </h1>
        <Link href="/shop" className="btn-ghost-gold px-6 py-2.5 text-sm font-bold rounded-full inline-block mt-2">
          Back to Shop
        </Link>
      </div>
    );
  }

  const chosenSize = selectedSize || product.sizes[0];
  const chosenColor = selectedColor || product.colors[0];

  const whatsappMessage = encodeURIComponent(
    `Hello, I'd like to place an order for: *${product.name}* (Size: ${chosenSize}, Color: ${chosenColor}) — ${formatPrice(product.price)}`
  );
  const whatsappUrl = `https://wa.me/2348185319037?text=${whatsappMessage}`;

  function handleAddToCart() {
    addToCart(product!, chosenSize, chosenColor);
    setAddedFeedback(true);
    openCart();
    setTimeout(() => setAddedFeedback(false), 2000);
  }

  // Related products
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-8 text-sm" aria-label="Breadcrumb">
        <Link
          href="/shop"
          className="flex items-center gap-1 hover:text-[var(--gold-primary)] transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Shop
        </Link>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span
          className="capitalize"
          style={{ color: "var(--text-muted)" }}
        >
          {product.category}
        </span>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span
          className="font-semibold truncate max-w-[200px]"
          style={{ color: "var(--text-primary)" }}
        >
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="relative rounded-2xl overflow-hidden product-img-overlay"
          style={{ aspectRatio: "1" }}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <button
            onClick={() => setWished((w) => !w)}
            className="absolute top-4 right-4 p-3 rounded-full transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
            }}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className="w-5 h-5"
              fill={wished ? "#c9922a" : "none"}
              stroke={wished ? "#c9922a" : "#666"}
            />
          </button>
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-xl">Sold Out</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {/* Category */}
          <span
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--gold-primary)" }}
          >
            {product.category}
          </span>

          {/* Name */}
          <h1
            className="text-3xl font-black mb-3 leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {product.name}
          </h1>

          {/* Price */}
          <p className="text-3xl font-black gold-text mb-4">
            {formatPrice(product.price)}
          </p>

          {/* Description */}
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            {product.description}
          </p>

          {/* Size selector */}
          <div className="mb-5">
            <p
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Size
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select size">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 rounded-full text-xs font-bold border transition-all duration-200 ${
                    chosenSize === size
                      ? "btn-gold border-transparent"
                      : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--gold-primary)] hover:text-[var(--gold-primary)]"
                  }`}
                  aria-pressed={chosenSize === size}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color selector */}
          <div className="mb-8">
            <p
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Color — <span style={{ color: "var(--gold-primary)" }}>{chosenColor}</span>
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select color">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-4 py-2 rounded-full text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 ${
                    chosenColor === color
                      ? "btn-gold border-transparent"
                      : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--gold-primary)] hover:text-[var(--gold-primary)]"
                  }`}
                  aria-pressed={chosenColor === color}
                >
                  {chosenColor === color && <Check className="w-3 h-3" />}
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-auto">
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="flex-1 btn-gold flex items-center justify-center gap-2 py-4 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart className="w-5 h-5" />
              {addedFeedback ? "Added to Cart ✓" : "Add to Cart"}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-full font-bold text-sm transition-all duration-200 hover:scale-[1.02]"
              style={{ background: "#25D366", color: "white" }}
            >
              <MessageCircle className="w-5 h-5" />
              Order on WhatsApp
            </a>
          </div>

          {/* In stock indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <div
              className={`w-2 h-2 rounded-full ${product.inStock ? "bg-green-500" : "bg-red-500"}`}
            />
            {product.inStock ? "In Stock" : "Out of Stock"}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="text-2xl font-black mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            You might also like
          </h2>
          <hr className="gold-divider mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="luxury-card overflow-hidden group"
              >
                <div className="relative" style={{ aspectRatio: "1" }}>
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <p
                    className="text-xs font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.name}
                  </p>
                  <p className="text-sm font-bold gold-text mt-1">
                    {formatPrice(p.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
