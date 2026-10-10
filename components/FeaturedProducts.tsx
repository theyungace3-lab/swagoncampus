"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { useProducts } from "@/contexts/ProductsContext";

/**
 * How many of the newest products the "New Arrivals" strip shows.
 * Everything older still appears automatically in the All Products section
 * below it, so the page always surfaces the full catalogue.
 */
const NEW_ARRIVALS_LIMIT = 40;

export function FeaturedProducts() {
  const { products } = useProducts();

  // Newest first. The API already sorts this way, but sorting here keeps the
  // 40-item rule correct no matter where the list came from (cache, fallback).
  const newestFirst = useMemo(
    () =>
      [...products].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [products]
  );

  const featured = newestFirst.filter((p) => p.featured).slice(0, 4);
  const newArrivals = newestFirst.slice(0, NEW_ARRIVALS_LIMIT);
  const allProducts = newestFirst;

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
                Editor&apos;s Pick
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
            {featured.map((product, i) => (
              <Reveal key={product.id} delay={i * 80} className="h-full">
                <ProductCard product={product} />
              </Reveal>
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

      {/* New Arrivals — the latest {NEW_ARRIVALS_LIMIT} products */}
      {newArrivals.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          aria-labelledby="new-arrivals-heading"
          style={{ background: "transparent" }}
        >
          <div className="flex items-end justify-between mb-8">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--gold-primary)" }}
              >
                Just Dropped
              </p>
              <h2
                id="new-arrivals-heading"
                className="text-3xl sm:text-4xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                New Arrivals
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {newArrivals.length} of the newest drop
                {newArrivals.length !== 1 ? "s" : ""}
              </p>
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
            {newArrivals.map((product, i) => (
              <Reveal
                key={product.id}
                delay={Math.min(i * 60, 480)}
                className="h-full"
              >
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>

          <div className="sm:hidden mt-6 text-center">
            <Link
              href="/shop"
              className="btn-ghost-gold inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-full"
            >
              See More <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* All Products — every product in the catalogue, filled in automatically */}
      {allProducts.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"
          aria-labelledby="all-products-heading"
        >
          <div className="flex items-end justify-between mb-8">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--gold-primary)" }}
              >
                Shop Everything
              </p>
              <h2
                id="all-products-heading"
                className="text-3xl sm:text-4xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                All Products
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {allProducts.length} item{allProducts.length !== 1 ? "s" : ""} in store
              </p>
            </div>
            <Link
              href="/shop"
              className="btn-ghost-gold hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-full"
            >
              Filter & Sort <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <hr className="gold-divider mb-8" />

          {/* One observer for the whole grid — this list can grow unbounded. */}
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Reveal>

          <div className="sm:hidden mt-6 text-center">
            <Link
              href="/shop"
              className="btn-ghost-gold inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-full"
            >
              Filter & Sort <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
