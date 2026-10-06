"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Edit2, LogOut, Package, Plus, RefreshCw, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice, normalizeCategory, getCategoryLabel } from "@/lib/products";
import { OWNER_MARKUP } from "@/lib/vendor";
import type { Category } from "@/lib/types";
import type { DbProduct } from "@/lib/supabase/types";
import { ProductForm, EMPTY_PRODUCT_FORM, type ProductFormValues } from "@/components/ProductForm";

function toFormValues(p: DbProduct): ProductFormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    category: normalizeCategory(p.category) as Category,
    image: p.image,
    sizes: [...p.sizes],
    colors: [...p.colors],
    in_stock: p.in_stock,
    featured: false,
    price: 0,
    vendor_price: Number(p.vendor_price ?? 0),
  };
}

export function VendorClient() {
  const { user, isVendor, isAdmin, profileError, refreshProfile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || profileError) return;
    if (isAdmin) router.replace("/admin");
    else if (!user || !isVendor) router.replace("/auth/signin?redirect=/vendor");
  }, [authLoading, user, isVendor, isAdmin, profileError, router]);

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editing, setEditing] = useState<DbProduct | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/vendor/products", { cache: "no-store" });
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isVendor) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/vendor/products", { cache: "no-store" });
        if (!active) return;
        if (res.ok) setProducts(await res.json());
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isVendor]);

  if (profileError && user && !authLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <p role="alert" className="mb-4 text-sm" style={{ color: "var(--text-primary)" }}>{profileError}</p>
        <button type="button" onClick={() => void refreshProfile()} className="btn-gold min-h-11 rounded-full px-5 py-2 font-semibold">Retry account loading</button>
      </div>
    );
  }

  if (authLoading || !user || !isVendor || isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  function startAdd() { setEditing(null); setView("add"); }
  function startEdit(p: DbProduct) { setEditing(p); setView("edit"); }

  async function submitProduct(payload: Record<string, unknown>) {
    const res = editing
      ? await fetch(`/api/products/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Could not save the product.");
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (deleteId !== id) { setDeleteId(id); setTimeout(() => setDeleteId(null), 3000); return; }
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
  }

  async function toggleStock(p: DbProduct) {
    await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ in_stock: !p.in_stock }) });
    await load();
  }

  if (view === "add" || view === "edit") {
    return (
      <ProductForm
        mode={view}
        title={view === "add" ? "Add New Product" : "Edit Product"}
        initial={editing ? toFormValues(editing) : EMPTY_PRODUCT_FORM}
        pricingMode="vendor"
        viewerIsVendor
        showFeatured={false}
        onSubmit={submitProduct}
        onCancel={() => setView("list")}
      />
    );
  }

  const inStock = products.filter((p) => p.in_stock).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
          <h1 className="text-3xl font-black gold-text">Vendor Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors" style={{ color: "var(--text-muted)" }} aria-label="Refresh products">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={async () => { await signOut(); router.push("/"); }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border hover:border-red-400 hover:text-red-500 transition-all" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      <div className="luxury-card p-5 mb-6">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage your own products. The store adds a {formatPrice(OWNER_MARKUP)} fee to your price — customers pay your price plus that fee.
          You only ever see and edit the products you upload.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Your products", value: products.length },
          { label: "In stock", value: inStock },
          { label: "Out of stock", value: products.length - inStock },
        ].map((s) => (
          <div key={s.label} className="luxury-card p-4">
            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{s.value}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <hr className="gold-divider mb-6" />

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{products.length} product{products.length !== 1 ? "s" : ""}</p>
        <button onClick={startAdd} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading your products…</p>
      ) : products.length === 0 ? (
        <div className="luxury-card p-10 text-center">
          <Package className="mx-auto mb-3 h-8 w-8" style={{ color: "var(--gold-primary)" }} />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>You haven&apos;t added any products yet.</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Click “Add Product” to upload your first item.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
          <table className="w-full text-sm" style={{ background: "var(--bg-card)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(201,146,42,0.05)" }}>
                {["Image", "Name", "Category", "Your price", "Customer pays", "Stock", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-[rgba(201,146,42,0.03)] transition-colors" style={{ borderColor: "var(--border-color)" }}>
                  <td className="px-4 py-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                      <Image src={p.image} alt={p.name} fill sizes="48px" className="object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold max-w-[160px] truncate" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                    <p className="text-xs truncate max-w-[160px]" style={{ color: "var(--text-muted)" }}>{p.sizes.join(", ")}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "rgba(201,146,42,0.1)", color: "var(--gold-primary)" }}>{getCategoryLabel(p.category)}</span>
                  </td>
                  <td className="px-4 py-3"><span className="font-bold" style={{ color: "var(--text-primary)" }}>{formatPrice(Number(p.vendor_price ?? 0))}</span></td>
                  <td className="px-4 py-3"><span className="font-bold gold-text">{formatPrice(p.price)}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStock(p)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: p.in_stock ? "#22c55e" : "#ef4444" }}>
                      {p.in_stock ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      {p.in_stock ? "In Stock" : "Out"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-[rgba(201,146,42,0.1)] transition-colors" style={{ color: "var(--gold-primary)" }} aria-label={`Edit ${p.name}`}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className={`p-1.5 rounded-lg transition-colors ${deleteId === p.id ? "bg-red-500 text-white" : "text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"}`} aria-label={`Delete ${p.name}`} title={deleteId === p.id ? "Confirm delete" : "Delete"}>
                        {deleteId === p.id ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
