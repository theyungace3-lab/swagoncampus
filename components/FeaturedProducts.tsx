"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/contexts/ProductsContext";

export function FeaturedProducts() {
  const { products } = useProducts();
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const newArrivals = products.filter((p) => !p.featured).slice(0, 4);

  return (
    <>
      {/* Featured */}
      {featured.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          aria-labelledby="featured-heading"
        >
          <div className="flex items-end justify-between mb-8">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--gold-primary)" }}
              >
                ✦ Editor&apos;s Pick
              </p>
              <h2
                id="featured-heading"
                className="text-3xl sm:text-4xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                Featured Pieces
              </h2>
            </div>
            <Link
              href="/shop"
              className="btn-ghost-gold hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-full"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <hr className="gold-divider mb-8" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="sm:hidden mt-6 text-center">
            <Link
              href="/shop"
              className="btn-ghost-gold inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-full"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"
          aria-labelledby="new-arrivals-heading"
          style={{ background: "transparent" }}
        >
          <div className="flex items-end justify-between mb-8">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--gold-primary)" }}
              >
                ✦ Just Dropped
              </p>
              <h2
                id="new-arrivals-heading"
                className="text-3xl sm:text-4xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                New Arrivals
              </h2>
            </div>
            <Link
              href="/shop"
              className="btn-ghost-gold hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-full"
            >
              See More <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <hr className="gold-divider mb-8" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
