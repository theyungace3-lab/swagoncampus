"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { useProducts } from "@/contexts/ProductsContext";

/** How many products each "See More" click reveals. */
const PAGE_SIZE = 8;

/** The most a vendor/store owner can see in the New Arrivals section. */
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

  // Each section pages independently; both open with PAGE_SIZE items so the
  // server and the first client render always agree.
  const [newArrivalsShown, setNewArrivalsShown] = useState(PAGE_SIZE);
  const [allShown, setAllShown] = useState(PAGE_SIZE);

  const visibleNewArrivals = newArrivals.slice(0, newArrivalsShown);
  const visibleAll = allProducts.slice(0, allShown);

  const moreNewArrivals = visibleNewArrivals.length < newArrivals.length;
  const moreAll = visibleAll.length < allProducts.length;

  return (
    <>
      {/* Featured */}
      {featured.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          aria-labelledby="featured-heading"
        >
          <div className="flex items-end justify-between mb-8 gap-4">
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
        </section>
      )}

      {/* New Arrivals — the newest {NEW_ARRIVALS_LIMIT} products, {PAGE_SIZE} at a time */}
      {newArrivals.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          aria-labelledby="new-arrivals-heading"
          style={{ background: "transparent" }}
        >
          <div className="flex items-end justify-between mb-8 gap-4">
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
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-muted)" }}
                aria-live="polite"
              >
                Showing {visibleNewArrivals.length} of {newArrivals.length}
              </p>
            </div>
            <Link
              href="/shop"
              className="btn-ghost-gold hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-full"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <hr className="gold-divider mb-8" />

          <div
            id="new-arrivals-grid"
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5"
          >
            {visibleNewArrivals.map((product, i) => (
              <Reveal
                key={product.id}
                delay={Math.min((i % PAGE_SIZE) * 60, 420)}
                className="h-full"
              >
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>

          {moreNewArrivals && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() =>
                  setNewArrivalsShown((shown) =>
                    Math.min(shown + PAGE_SIZE, newArrivals.length)
                  )
                }
                aria-controls="new-arrivals-grid"
                className="btn-ghost-gold inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold"
              >
                See More <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      )}

      {/* All Products — every product, {PAGE_SIZE} at a time */}
      {allProducts.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"
          aria-labelledby="all-products-heading"
        >
          <div className="flex items-end justify-between mb-8 gap-4">
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
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-muted)" }}
                aria-live="polite"
              >
                Showing {visibleAll.length} of {allProducts.length}
              </p>
            </div>
            <Link
              href="/shop"
              className="btn-ghost-gold hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-full"
            >
              Filter &amp; Sort <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <hr className="gold-divider mb-8" />

          <div
            id="all-products-grid"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
          >
            {visibleAll.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {moreAll && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() =>
                  setAllShown((shown) =>
                    Math.min(shown + PAGE_SIZE, allProducts.length)
                  )
                }
                aria-controls="all-products-grid"
                className="btn-ghost-gold inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold"
              >
                See More <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
