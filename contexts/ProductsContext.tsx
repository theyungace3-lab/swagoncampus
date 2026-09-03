"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Product } from "@/lib/types";
import { SAMPLE_PRODUCTS } from "@/lib/products";

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  refresh: () => Promise<void>;
  // Legacy local helpers (used by admin via API now)
  addProduct: (product: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  resetToSample: () => void;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

// Map Supabase snake_case → our camelCase Product type
function mapDbProduct(p: Record<string, unknown>): Product {
  return {
    id:          String(p.id),
    name:        String(p.name),
    description: String(p.description ?? ""),
    price:       Number(p.price),
    category:    String(p.category) as Product["category"],
    image:       String(p.image),
    sizes:       Array.isArray(p.sizes)  ? (p.sizes  as string[]) : [],
    colors:      Array.isArray(p.colors) ? (p.colors as string[]) : [],
    inStock:     Boolean(p.in_stock),
    featured:    Boolean(p.featured),
    createdAt:   String(p.created_at ?? new Date().toISOString()),
    // attach discount if present
    // @ts-expect-error – extended field
    discounts:   p.discounts ?? [],
  };
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [loading,  setLoading]  = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>[];
        setProducts(data.map(mapDbProduct));
      }
      // If API fails (env not configured yet) keep SAMPLE_PRODUCTS
    } catch {
      // silently fall back to sample data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Local fallback helpers (used before Supabase is configured) ──
  function addProduct(product: Omit<Product, "id" | "createdAt">) {
    setProducts((prev) => [{ ...product, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...prev]);
  }
  function updateProduct(id: string, updates: Partial<Product>) {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  }
  function deleteProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }
  function resetToSample() { setProducts(SAMPLE_PRODUCTS); }

  return (
    <ProductsContext.Provider value={{ products, loading, refresh, addProduct, updateProduct, deleteProduct, resetToSample }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
}
