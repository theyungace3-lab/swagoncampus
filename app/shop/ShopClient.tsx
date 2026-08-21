"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/contexts/ProductsContext";
import { CATEGORIES } from "@/lib/products";
import { Category } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name A–Z" },
];

export function ShopClient() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get("category") ?? "all") as Category | "all";

  const { products } = useProducts();
  const [activeCategory, setActiveCategory] = useState<Category | "all">(initialCategory);
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...products];

    if (activeCategory !== "all") {
      result = result.filter((p) => p.category === activeCategory);
    }

    switch (sort) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return result;
  }, [products, activeCategory, sort]);

  const categoryLabel =
    activeCategory === "all"
      ? "All Items"
      : CATEGORIES.find((c) => c.id === activeCategory)?.label ?? activeCategory;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="mb-8">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: "var(--gold-primary)" }}
        >
          ✦ Explore
        </p>
        <h1
          className="text-4xl sm:text-5xl font-black"
          style={{ color: "var(--text-primary)" }}
        >
          {categoryLabel}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <hr className="gold-divider mb-8" />

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Mobile filter toggle */}
        <button
          className="sm:hidden flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors"
          style={{ borderColor: "var(--gold-primary)", color: "var(--gold-primary)" }}
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-label="Toggle category filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>

        {/* Category pills — desktop always visible, mobile toggle */}
        <div
          className={`flex flex-wrap gap-2 ${showFilters ? "flex" : "hidden sm:flex"}`}
          role="group"
          aria-label="Category filter"
        >
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              activeCategory === "all" ? "btn-gold" : "btn-ghost-gold"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                activeCategory === cat.id ? "btn-gold" : "btn-ghost-gold"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          {activeCategory !== "all" && (
            <button
              onClick={() => setActiveCategory("all")}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(201,146,42,0.12)",
                color: "var(--gold-primary)",
              }}
              aria-label="Clear category filter"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
          <label htmlFor="sort-select" className="sr-only">Sort by</label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-full border outline-none cursor-pointer"
            style={{
              borderColor: "var(--border-color)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-5xl mb-4">👗</p>
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            No items found
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            Try a different category or check back later.
          </p>
          <button
            onClick={() => setActiveCategory("all")}
            className="mt-6 btn-gold px-6 py-2.5 text-sm font-bold rounded-full"
          >
            View All Items
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
