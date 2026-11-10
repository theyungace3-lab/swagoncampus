"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { Reveal } from "@/components/Reveal";
import { useProducts } from "@/contexts/ProductsContext";
import { ALL_PRODUCTS_PAGE_SIZE, createProductMix } from "@/lib/productMix";

const NEW_ARRIVALS_PAGE_SIZE = 8;
const MIX_STORAGE_KEY = "soc:homepage-product-mix:v1";

type MixVisit = { seed: number; previousOpeningIds: string[] };

/** The most a vendor/store owner can see in the New Arrivals section. */
const NEW_ARRIVALS_LIMIT = 40;

export function FeaturedProducts() {
  const { products, loading } = useProducts();
  const [mixVisit, setMixVisit] = useState<MixVisit | null>(null);
  const visitRef = useRef<MixVisit | null>(null);
  const savedOpening = useRef(false);

  useEffect(() => {
    let active = true;
    // Client-only initialization; keep the snapshot across Strict Mode replay.
    queueMicrotask(() => {
      if (!active) return;
      if (!visitRef.current) {
        let previousOpeningIds: string[] = [];
        try {
          const stored: unknown = JSON.parse(sessionStorage.getItem(MIX_STORAGE_KEY) ?? "[]");
          if (Array.isArray(stored) && stored.every((id) => typeof id === "string")) {
            previousOpeningIds = [...new Set<string>(stored)].slice(0, ALL_PRODUCTS_PAGE_SIZE);
          }
        } catch {
          // Storage is optional; a fresh random mix still works without it.
        }
        visitRef.current = {
          seed: window.crypto.getRandomValues(new Uint32Array(1))[0],
          previousOpeningIds,
        };
      }
      setMixVisit(visitRef.current);
    });
    return () => { active = false; };
  }, []);

  // Newest first. The API already sorts this way, but sorting here keeps the
  // 40-item rule correct no matter where the list came from (cache, fallback).
  const newestFirst = useMemo(
    () =>
      [...products].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
          a.id.localeCompare(b.id)
      ),
    [products]
  );

  const featured = newestFirst.filter((p) => p.featured).slice(0, 4);
  const newArrivals = newestFirst.slice(0, NEW_ARRIVALS_LIMIT);
  const allProducts = useMemo(
    () => {
      if (!mixVisit) return [];
      return createProductMix(newestFirst, {
        ...mixVisit,
        newArrivalIds: newestFirst.slice(0, NEW_ARRIVALS_PAGE_SIZE).map((product) => product.id),
      });
    },
    [newestFirst, mixVisit]
  );

  useEffect(() => {
    if (savedOpening.current || !mixVisit || loading || allProducts.length === 0) return;
    savedOpening.current = true;
    try {
      sessionStorage.setItem(
        MIX_STORAGE_KEY,
        JSON.stringify(allProducts.slice(0, ALL_PRODUCTS_PAGE_SIZE).map((product) => product.id))
      );
    } catch {
      // Storage restrictions must never prevent the catalogue from rendering.
    }
  }, [allProducts, loading, mixVisit]);

  const [newArrivalsShown, setNewArrivalsShown] = useState(NEW_ARRIVALS_PAGE_SIZE);
  const [allShown, setAllShown] = useState(ALL_PRODUCTS_PAGE_SIZE);
  const mixLoading = (loading && products.length === 0) || (products.length > 0 && !mixVisit);

  const visibleNewArrivals = newArrivals.slice(0, newArrivalsShown);
  const visibleAll = allProducts.slice(0, allShown);

  const moreNewArrivals = visibleNewArrivals.length < newArrivals.length;
  const moreAll = visibleAll.length < allProducts.length;

  return (
    <>
      {/* While the real catalogue loads, show skeletons — never demo products */}
      {loading && products.length === 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"
          aria-busy="true"
          aria-label="Loading products"
        >
          <div className="mb-8">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "var(--gold-primary)" }}
            >
              Just Dropped
            </p>
            <h2
              className="text-3xl sm:text-4xl font-black"
              style={{ color: "var(--text-primary)" }}
            >
              New Arrivals
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Loading the latest drops…
            </p>
          </div>
          <hr className="gold-divider mb-8" />
          <ProductGridSkeleton />
        </section>
      )}

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

      {/* New Arrivals: newest first, with independent eight-item pagination. */}
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
                delay={Math.min((i % NEW_ARRIVALS_PAGE_SIZE) * 60, 420)}
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
                    Math.min(shown + NEW_ARRIVALS_PAGE_SIZE, newArrivals.length)
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

      {/* All Products: one stable, category-balanced sequence per visit. */}
      {(mixLoading || allProducts.length > 0) && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20"
          aria-labelledby="all-products-heading"
          aria-busy={mixLoading}
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
                {mixLoading ? "Loading a fresh mix..." : `Showing ${visibleAll.length} of ${allProducts.length}`}
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

          {mixLoading ? (
            <ProductGridSkeleton
              count={ALL_PRODUCTS_PAGE_SIZE}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
            />
          ) : (
            <div
              id="all-products-grid"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
            >
              {visibleAll.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {moreAll && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() =>
                  setAllShown((shown) =>
                    Math.min(shown + ALL_PRODUCTS_PAGE_SIZE, allProducts.length)
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
