"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Product } from "@/lib/types";
import { normalizeCategory, sanitizeDisplayText } from "@/lib/products";

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

// Map Supabase snake_case → our camelCase Product type
function mapDbProduct(p: Record<string, unknown>): Product {
  return {
    id:          String(p.id),
    name:        sanitizeDisplayText(String(p.name)),
    description: sanitizeDisplayText(String(p.description ?? "")),
    price:       Number(p.price),
    category:    normalizeCategory(String(p.category)),
    image:       String(p.image),
    sizes:       Array.isArray(p.sizes)  ? (p.sizes  as string[]) : [],
    colors:      Array.isArray(p.colors) ? (p.colors as string[]) : [],
    inStock:     Boolean(p.in_stock),
    featured:    Boolean(p.featured),
    condition:   p.product_condition === "thrift" ? "thrift" : p.product_condition === "new" ? "new" : undefined,
    createdAt:   String(p.created_at ?? new Date().toISOString()),
    // attach discount if present
    // @ts-expect-error – extended field
    discounts:   p.discounts ?? [],
  };
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  // Starts empty + loading: consumers render skeletons until the real
  // catalogue arrives. Never seed demo products — the old sample catalogue
  // must not flash on refresh.
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>[];
        setProducts(data.map(mapDbProduct));
      }
      // On failure keep whatever we had (empty on first load) — showing a
      // demo/empty catalogue is better than showing the wrong products.
    } catch {
      // keep previous products
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Purge the legacy localStorage catalogue (v1/v2 demo-era caches) so old
    // products can never surface again from a stale client cache.
    try {
      localStorage.removeItem("soc_products");
      localStorage.removeItem("soc_products_v2");
    } catch {
      // ignore
    }
    refresh();
  }, [refresh]);

  return (
    <ProductsContext.Provider value={{ products, loading, refresh }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
}
