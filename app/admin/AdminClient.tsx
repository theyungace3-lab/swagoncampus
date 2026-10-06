"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Edit2, Star, Package, ToggleLeft, ToggleRight, Check,
  LogOut, Tag, RefreshCw, ShoppingBag, TrendingUp, Store, Users, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { formatPrice, normalizeCategory, getCategoryLabel } from "@/lib/products";
import type { Category } from "@/lib/types";
import type { DbProduct, DbDiscount } from "@/lib/supabase/types";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { ProductForm, EMPTY_PRODUCT_FORM, type ProductFormValues } from "@/components/ProductForm";

interface VendorRow {
  id: string;
  email: string;
  fullName: string;
  role: "customer" | "admin" | "vendor";
  isOwner: boolean;
  productCount: number;
}

type Tab = "analytics" | "products" | "vendors" | "discounts";

function toFormValues(p: DbProduct): ProductFormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    category: normalizeCategory(p.category) as Category,
    image: p.image,
    sizes: [...p.sizes],
    colors: [...p.colors],
    in_stock: p.in_stock,
    featured: p.featured,
    price: p.vendor_id ? Number(p.vendor_price ?? 0) : Number(p.price),
    vendor_price: Number(p.vendor_price ?? 0),
  };
}

export function AdminClient() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/auth/signin?redirect=/admin");
    }
  }, [authLoading, user, isAdmin, router]);

  const [tab, setTab] = useState<Tab>("analytics");
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [discounts, setDiscounts] = useState<DbDiscount[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [vendorBusy, setVendorBusy] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editing, setEditing] = useState<DbProduct | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [discForm, setDiscForm] = useState({
    label: "", type: "percentage" as "percentage" | "fixed",
    value: 0, product_id: "" as string | null, active: true, ends_at: "",
  });
  const [discSaving, setDiscSaving] = useState(false);
  const [discError, setDiscError] = useState("");

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }, []);

  const loadDiscounts = useCallback(async () => {
    const res = await fetch("/api/discounts?all=true");
    if (res.ok) setDiscounts(await res.json());
    setStatsLoading(false);
  }, []);

  const loadVendors = useCallback(async () => {
    const res = await fetch("/api/admin/vendors");
    if (res.ok) setVendors(await res.json());
  }, []);

  useEffect(() => {
    if (isAdmin) { loadProducts(); loadDiscounts(); loadVendors(); }
  }, [isAdmin, loadProducts, loadDiscounts, loadVendors]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const vendorLabel = (id: string | null) => {
    if (!id) return "You (store)";
    const v = vendorById.get(id);
    return v?.fullName || v?.email || "Vendor";
  };

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
    await loadProducts();
    await loadVendors();
  }

  async function handleDelete(id: string) {
    if (deleteId !== id) { setDeleteId(id); setTimeout(() => setDeleteId(null), 3000); return; }
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await loadProducts();
    await loadVendors();
  }

  async function toggleStock(p: DbProduct) {
    await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ in_stock: !p.in_stock }) });
    await loadProducts();
  }
  async function toggleFeatured(p: DbProduct) {
    await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featured: !p.featured }) });
    await loadProducts();
  }

  async function setRole(vendorId: string, role: "vendor" | "customer") {
    setVendorBusy(vendorId);
    await fetch("/api/admin/vendors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: vendorId, role }) });
    await loadVendors();
    setVendorBusy(null);
  }

  async function handleAddDiscount(e: React.FormEvent) {
    e.preventDefault();
    if (!discForm.label.trim()) { setDiscError("Label is required."); return; }
    if (discForm.value <= 0) { setDiscError("Value must be > 0."); return; }
    setDiscError(""); setDiscSaving(true);
    await fetch("/api/discounts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: discForm.label, type: discForm.type, value: discForm.value, product_id: discForm.product_id || null, active: discForm.active, ends_at: discForm.ends_at || null }),
    });
    await loadDiscounts();
    setDiscForm({ label: "", type: "percentage", value: 0, product_id: "", active: true, ends_at: "" });
    setDiscSaving(false);
  }
  async function toggleDiscount(d: DbDiscount) {
    await fetch("/api/discounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id, active: !d.active }) });
    await loadDiscounts();
  }
  async function deleteDiscount(id: string) {
    await fetch(`/api/discounts?id=${id}`, { method: "DELETE" });
    await loadDiscounts();
  }

  if (view === "add" || view === "edit") {
    return (
      <ProductForm
        mode={view}
        title={view === "add" ? "Add New Product" : "Edit Product"}
        initial={editing ? toFormValues(editing) : EMPTY_PRODUCT_FORM}
        pricingMode={editing?.vendor_id ? "vendor" : "store"}
        viewerIsVendor={false}
        showFeatured
        onSubmit={submitProduct}
        onCancel={() => setView("list")}
      />
    );
  }

  const activeDiscounts = discounts.filter((d) => d.active).length;
  const inStockCount = products.filter((p) => p.in_stock).length;
  const visibleProducts = products.filter((p) =>
    vendorFilter === "all" ? true : vendorFilter === "mine" ? p.vendor_id === null : p.vendor_id === vendorFilter
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
          <h1 className="text-3xl font-black gold-text">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          {tab !== "analytics" && (
            <button onClick={() => { loadProducts(); loadDiscounts(); loadVendors(); }}
              className="p-2 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors" style={{ color: "var(--text-muted)" }} aria-label="Refresh products and discounts">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button onClick={async () => { await signOut(); router.push("/"); }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border hover:border-red-400 hover:text-red-500 transition-all" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {tab !== "analytics" && !statsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { icon: <Package className="w-5 h-5" />, label: "Products", value: products.length },
            { icon: <Store className="w-5 h-5" />, label: "Vendor Products", value: products.filter((p) => p.vendor_id).length },
            { icon: <ShoppingBag className="w-5 h-5" />, label: "In Stock", value: inStockCount },
            { icon: <Users className="w-5 h-5" />, label: "Vendors", value: vendors.filter((v) => v.role === "vendor").length },
            { icon: <Tag className="w-5 h-5" />, label: "Active Sales", value: activeDiscounts },
          ].map((s) => (
            <div key={s.label} className="luxury-card p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: "rgba(201,146,42,0.1)", color: "var(--gold-primary)" }}>{s.icon}</div>
              <div>
                <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="gold-divider mb-6" />

      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Admin sections">
        {(["analytics", "products", "vendors", "discounts"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`min-h-11 px-5 py-2 rounded-full text-sm font-bold capitalize transition-all ${tab === t ? "btn-gold" : "btn-ghost-gold"}`}>
            {t === "analytics" ? "Analytics" : t === "discounts" ? "Sales & Discounts" : t === "vendors" ? "Vendors" : "Products"}
          </button>
        ))}
      </div>

      {tab === "analytics" && <AdminAnalytics />}

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{visibleProducts.length} of {products.length} product{products.length !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                <span className="sr-only">Filter by uploader</span>
                <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="admin-input text-xs py-2 min-w-40">
                  <option value="all">All uploads</option>
                  <option value="mine">My products</option>
                  {vendors.filter((v) => v.role === "vendor").map((v) => (
                    <option key={v.id} value={v.id}>{v.fullName || v.email}</option>
                  ))}
                </select>
              </label>
              <button onClick={startAdd} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
            <table className="w-full text-sm" style={{ background: "var(--bg-card)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(201,146,42,0.05)" }}>
                  {["Image", "Name", "Uploaded by", "Category", "Price", "Stock", "Featured", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((p) => (
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
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: p.vendor_id ? "rgba(201,146,42,0.1)" : "rgba(34,197,94,0.1)", color: p.vendor_id ? "var(--gold-primary)" : "#22c55e" }}>
                        {vendorLabel(p.vendor_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "rgba(201,146,42,0.1)", color: "var(--gold-primary)" }}>{getCategoryLabel(p.category)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold gold-text">{formatPrice(p.price)}</span>
                      {p.vendor_id && <span className="block text-[10px]" style={{ color: "var(--text-muted)" }}>vendor {formatPrice(Number(p.vendor_price ?? 0))}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStock(p)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: p.in_stock ? "#22c55e" : "#ef4444" }}>
                        {p.in_stock ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {p.in_stock ? "In Stock" : "Out"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFeatured(p)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: p.featured ? "var(--gold-primary)" : "var(--text-muted)" }}>
                        <Star className="w-4 h-4" />{p.featured ? "Yes" : "No"}
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
                {visibleProducts.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No products match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── VENDORS TAB ── */}
      {tab === "vendors" && (
        <div>
          <div className="luxury-card p-5 mb-6 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--gold-primary)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Promote an account to <strong>vendor</strong> so it can sign in and manage its own products at <code>/vendor</code>.
              Vendors only ever see, edit and delete the products they upload. Demote to remove their access.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
            <table className="w-full text-sm" style={{ background: "var(--bg-card)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(201,146,42,0.05)" }}>
                  {["Account", "Role", "Products", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-b last:border-b-0 hover:bg-[rgba(201,146,42,0.03)]" style={{ borderColor: "var(--border-color)" }}>
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{v.fullName || v.email}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{v.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize" style={{ background: v.role === "vendor" ? "rgba(201,146,42,0.12)" : "var(--bg-secondary)", color: v.role === "vendor" ? "var(--gold-primary)" : "var(--text-muted)" }}>
                        {v.isOwner ? "Owner" : v.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-secondary)" }}>{v.productCount}</td>
                    <td className="px-4 py-3">
                      {v.isOwner ? (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Supreme access</span>
                      ) : (
                        <button
                          onClick={() => setRole(v.id, v.role === "vendor" ? "customer" : "vendor")}
                          disabled={vendorBusy === v.id}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 ${v.role === "vendor" ? "btn-ghost-gold" : "btn-gold border-transparent"}`}
                        >
                          {vendorBusy === v.id ? "Saving…" : v.role === "vendor" ? "Remove vendor" : "Make vendor"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No accounts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DISCOUNTS TAB ── */}
      {tab === "discounts" && (
        <div className="space-y-8">
          <div className="luxury-card p-6">
            <h2 className="text-lg font-black mb-5 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Tag className="w-5 h-5" style={{ color: "var(--gold-primary)" }} /> Create Sale / Discount
            </h2>
            <form onSubmit={handleAddDiscount} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Label *">
                <input type="text" value={discForm.label} onChange={(e) => setDiscForm((f) => ({ ...f, label: e.target.value }))} placeholder='e.g. "Clearance Sale 20% Off"' className="admin-input" />
              </Field>
              <Field label="Applies to product (leave blank for site-wide)">
                <select value={discForm.product_id ?? ""} onChange={(e) => setDiscForm((f) => ({ ...f, product_id: e.target.value || null }))} className="admin-input">
                  <option value="">All products (site-wide)</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Discount Type">
                <select value={discForm.type} onChange={(e) => setDiscForm((f) => ({ ...f, type: e.target.value as "percentage" | "fixed" }))} className="admin-input">
                  <option value="percentage">Percentage (%) off</option>
                  <option value="fixed">Fixed amount (₦) off</option>
                </select>
              </Field>
              <Field label={discForm.type === "percentage" ? "Percentage (1–100)" : "Amount off (₦)"}>
                <input type="number" min={1} max={discForm.type === "percentage" ? 100 : undefined} value={discForm.value || ""} onChange={(e) => setDiscForm((f) => ({ ...f, value: Number(e.target.value) }))} placeholder={discForm.type === "percentage" ? "e.g. 20" : "e.g. 1000"} className="admin-input" />
              </Field>
              <Field label="Ends At (optional)">
                <input type="datetime-local" value={discForm.ends_at} onChange={(e) => setDiscForm((f) => ({ ...f, ends_at: e.target.value }))} className="admin-input" />
              </Field>
              <Field label="Status">
                <button type="button" onClick={() => setDiscForm((f) => ({ ...f, active: !f.active }))} className="flex items-center gap-2 text-sm font-semibold" style={{ color: discForm.active ? "#22c55e" : "#ef4444" }}>
                  {discForm.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  {discForm.active ? "Active" : "Inactive"}
                </button>
              </Field>
              {discError && <div className="sm:col-span-2 px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-200">{discError}</div>}
              <div className="sm:col-span-2">
                <button type="submit" disabled={discSaving} className="btn-gold flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm disabled:opacity-60">
                  <TrendingUp className="w-4 h-4" /> {discSaving ? "Saving…" : "Create Discount"}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-black mb-4" style={{ color: "var(--text-primary)" }}>Active &amp; Past Discounts</h2>
            {discounts.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No discounts yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
                <table className="w-full text-sm" style={{ background: "var(--bg-card)" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(201,146,42,0.05)" }}>
                      {["Label", "Type", "Value", "Scope", "Ends", "Status", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map((d) => (
                      <tr key={d.id} className="border-b last:border-b-0 hover:bg-[rgba(201,146,42,0.03)]" style={{ borderColor: "var(--border-color)" }}>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{d.label}</td>
                        <td className="px-4 py-3 capitalize" style={{ color: "var(--text-muted)" }}>{d.type}</td>
                        <td className="px-4 py-3 font-bold gold-text">{d.type === "percentage" ? `${d.value}%` : formatPrice(d.value)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{d.product_id ? products.find((p) => p.id === d.product_id)?.name ?? "Specific" : "Site-wide"}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{d.ends_at ? new Date(d.ends_at).toLocaleDateString() : "None"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleDiscount(d)} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: d.active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: d.active ? "#22c55e" : "#ef4444" }}>
                            {d.active ? "Active" : "Paused"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteDiscount(d.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" aria-label="Delete discount"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{hint}</p>}
      {children}
    </div>
  );
}
