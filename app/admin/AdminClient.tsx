"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Edit2, Sparkles, Package,
  ToggleLeft, ToggleRight, X, Check, LogOut, Tag, RefreshCw,
  ShoppingBag, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { CATEGORIES, formatPrice } from "@/lib/products";
import { Category } from "@/lib/types";
import type { DbProduct, DbDiscount } from "@/lib/supabase/types";

const SIZE_OPTIONS  = ["XS","S","M","L","XL","XXL","One Size","28","30","32","34","36","38","39","40","41","42","43","44"];
const COLOR_OPTIONS = ["White","Black","Grey","Navy","Brown","Beige","Blue","Red","Green","Pink","Gold","Olive","Sage","Khaki"];

const EMPTY_FORM = {
  name: "", price: 0, category: "tops" as Category,
  image: "", description: "", sizes: [] as string[], colors: [] as string[],
  in_stock: true, featured: false,
};

type Tab = "products" | "discounts" | "orders";

export function AdminClient() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const router   = useRouter();

  // redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/auth/signin?redirect=/admin");
    }
  }, [authLoading, user, isAdmin, router]);

  const [tab, setTab]         = useState<Tab>("products");
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [discounts, setDiscounts] = useState<DbDiscount[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Product form
  const [view, setView]           = useState<"list"|"add"|"edit">("list");
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving]       = useState(false);
  const [saveOk, setSaveOk]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string|null>(null);
  const [customSize, setCustomSize]   = useState("");
  const [customColor, setCustomColor] = useState("");

  // Discount form
  const [discForm, setDiscForm] = useState({
    label: "", type: "percentage" as "percentage"|"fixed",
    value: 0, product_id: "" as string|null, active: true, ends_at: "",
  });
  const [discSaving, setDiscSaving] = useState(false);
  const [discError, setDiscError]   = useState("");

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }, []);

  const loadDiscounts = useCallback(async () => {
    const res = await fetch("/api/discounts?all=true");
    if (res.ok) setDiscounts(await res.json());
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) { loadProducts(); loadDiscounts(); }
  }, [isAdmin, loadProducts, loadDiscounts]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--gold-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── Product helpers ──────────────────────────────────────
  function startAdd() { setForm(EMPTY_FORM); setEditingId(null); setFormError(""); setView("add"); }

  function startEdit(p: DbProduct) {
    setForm({
      name: p.name, price: p.price, category: p.category as Category,
      image: p.image, description: p.description, sizes: [...p.sizes],
      colors: [...p.colors], in_stock: p.in_stock, featured: p.featured,
    });
    setEditingId(p.id); setFormError(""); setView("edit");
  }

  function toggleSize(s: string) {
    setForm((f) => ({ ...f, sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s] }));
  }
  function toggleColor(c: string) {
    setForm((f) => ({ ...f, colors: f.colors.includes(c) ? f.colors.filter((x) => x !== c) : [...f.colors, c] }));
  }

  async function handleSave() {
    if (!form.name.trim())   { setFormError("Name is required."); return; }
    if (form.price <= 0)     { setFormError("Price must be > 0."); return; }
    if (!form.image.trim())  { setFormError("Image URL is required."); return; }
    if (!form.sizes.length)  { setFormError("Select at least one size."); return; }
    if (!form.colors.length) { setFormError("Select at least one color."); return; }
    setFormError(""); setSaving(true);

    const payload = { ...form, category: String(form.category) };

    if (view === "add") {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else if (editingId) {
      await fetch(`/api/products/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await loadProducts();
    setSaving(false); setSaveOk(true);
    setTimeout(() => { setSaveOk(false); setView("list"); }, 1200);
  }

  async function handleDelete(id: string) {
    if (deleteId !== id) { setDeleteId(id); setTimeout(() => setDeleteId(null), 3000); return; }
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleteId(null); await loadProducts();
  }

  async function toggleStock(p: DbProduct) {
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ in_stock: !p.in_stock }),
    });
    await loadProducts();
  }
  async function toggleFeatured(p: DbProduct) {
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !p.featured }),
    });
    await loadProducts();
  }

  // ── Discount helpers ─────────────────────────────────────
  async function handleAddDiscount(e: React.FormEvent) {
    e.preventDefault();
    if (!discForm.label.trim()) { setDiscError("Label is required."); return; }
    if (discForm.value <= 0)    { setDiscError("Value must be > 0."); return; }
    setDiscError(""); setDiscSaving(true);

    await fetch("/api/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label:      discForm.label,
        type:       discForm.type,
        value:      discForm.value,
        product_id: discForm.product_id || null,
        active:     discForm.active,
        ends_at:    discForm.ends_at || null,
      }),
    });

    await loadDiscounts();
    setDiscForm({ label: "", type: "percentage", value: 0, product_id: "", active: true, ends_at: "" });
    setDiscSaving(false);
  }

  async function toggleDiscount(d: DbDiscount) {
    await fetch(`/api/discounts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, active: !d.active }),
    });
    await loadDiscounts();
  }

  async function deleteDiscount(id: string) {
    await fetch(`/api/discounts?id=${id}`, { method: "DELETE" });
    await loadDiscounts();
  }

  // ── Stats ────────────────────────────────────────────────
  const activeDiscounts = discounts.filter((d) => d.active).length;
  const inStockCount    = products.filter((p) => p.in_stock).length;

  // ════════════════════════════════════════════════════════
  //  PRODUCT FORM VIEW
  // ════════════════════════════════════════════════════════
  if (view === "add" || view === "edit") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setView("list")} className="p-2 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors" style={{ color: "var(--text-muted)" }} aria-label="Back">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black gold-text">{view === "add" ? "Add New Product" : "Edit Product"}</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>All fields marked * are required</p>
          </div>
        </div>
        <hr className="gold-divider mb-8" />

        <div className="luxury-card p-6 space-y-6">
          {/* Name */}
          <Field label="Product Name" required>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Campus Hoodie" className="admin-input" />
          </Field>

          {/* Category */}
          <Field label="Category" required>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))} className="admin-input">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>

          {/* Price */}
          <Field label="Price (₦)" required>
            <input type="number" min={0} value={form.price || ""} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} placeholder="e.g. 6500" className="admin-input" />
          </Field>

          {/* Image URL */}
          <Field label="Image URL" required hint="Paste a direct .jpg/.png URL (Unsplash, Google Drive public, etc.)">
            <input type="url" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="https://images.unsplash.com/..." className="admin-input" />
            {form.image && (
              <div className="mt-3 relative w-24 h-24 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-color)" }}>
                <Image src={form.image} alt="Preview" fill sizes="96px" className="object-cover" />
              </div>
            )}
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="admin-input resize-none" placeholder="Brief product description…" />
          </Field>

          {/* Sizes */}
          <Field label="Sizes" required>
            <div className="flex flex-wrap gap-2 mb-3">
              {SIZE_OPTIONS.map((s) => (
                <button key={s} type="button" onClick={() => toggleSize(s)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.sizes.includes(s) ? "btn-gold border-transparent" : "btn-ghost-gold"}`} aria-pressed={form.sizes.includes(s)}>{s}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={customSize} onChange={(e) => setCustomSize(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (customSize.trim()) { toggleSize(customSize.trim()); setCustomSize(""); } } }} placeholder="Custom size" className="admin-input flex-1 text-xs py-2" />
              <button type="button" onClick={() => { if (customSize.trim()) { toggleSize(customSize.trim()); setCustomSize(""); } }} className="btn-ghost-gold px-3 py-2 rounded-full text-xs font-bold">Add</button>
            </div>
            {form.sizes.length > 0 && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Selected: {form.sizes.join(", ")}</p>}
          </Field>

          {/* Colors */}
          <Field label="Colors" required>
            <div className="flex flex-wrap gap-2 mb-3">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => toggleColor(c)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.colors.includes(c) ? "btn-gold border-transparent" : "btn-ghost-gold"}`} aria-pressed={form.colors.includes(c)}>{c}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={customColor} onChange={(e) => setCustomColor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (customColor.trim()) { toggleColor(customColor.trim()); setCustomColor(""); } } }} placeholder="Custom color" className="admin-input flex-1 text-xs py-2" />
              <button type="button" onClick={() => { if (customColor.trim()) { toggleColor(customColor.trim()); setCustomColor(""); } }} className="btn-ghost-gold px-3 py-2 rounded-full text-xs font-bold">Add</button>
            </div>
            {form.colors.length > 0 && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Selected: {form.colors.join(", ")}</p>}
          </Field>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="In Stock">
              <button type="button" onClick={() => setForm((f) => ({ ...f, in_stock: !f.in_stock }))} className="flex items-center gap-2 text-sm font-semibold" style={{ color: form.in_stock ? "#22c55e" : "#ef4444" }} aria-pressed={form.in_stock}>
                {form.in_stock ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                {form.in_stock ? "Yes" : "No"}
              </button>
            </Field>
            <Field label="Featured">
              <button type="button" onClick={() => setForm((f) => ({ ...f, featured: !f.featured }))} className="flex items-center gap-2 text-sm font-semibold" style={{ color: form.featured ? "var(--gold-primary)" : "var(--text-muted)" }} aria-pressed={form.featured}>
                {form.featured ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                {form.featured ? "Yes" : "No"}
              </button>
            </Field>
          </div>

          {formError && <div className="px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200">{formError}</div>}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setView("list")} className="flex-1 btn-ghost-gold py-3 rounded-full font-bold text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold text-sm disabled:opacity-60" style={{ flex: 2 }}>
              {saveOk ? <><Check className="w-4 h-4" /> Saved!</> : saving ? "Saving…" : <><Package className="w-4 h-4" /> {view === "add" ? "Add Product" : "Save Changes"}</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  MAIN DASHBOARD
  // ════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
          <h1 className="text-3xl font-black gold-text">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { loadProducts(); loadDiscounts(); }}
            className="p-2 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors" style={{ color: "var(--text-muted)" }} aria-label="Refresh data">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={async () => { await signOut(); router.push("/"); }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border hover:border-red-400 hover:text-red-500 transition-all" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      {!statsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Package className="w-5 h-5" />, label: "Products", value: products.length },
            { icon: <ShoppingBag className="w-5 h-5" />, label: "In Stock", value: inStockCount },
            { icon: <Sparkles className="w-5 h-5" />, label: "Featured", value: products.filter((p) => p.featured).length },
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["products", "discounts"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-bold capitalize transition-all ${tab === t ? "btn-gold" : "btn-ghost-gold"}`}>
            {t === "discounts" ? "Sales & Discounts" : "Products"}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{products.length} product{products.length !== 1 ? "s" : ""}</p>
            <button onClick={startAdd} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
            <table className="w-full text-sm" style={{ background: "var(--bg-card)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(201,146,42,0.05)" }}>
                  {["Image","Name","Category","Price","Stock","Featured","Actions"].map((h) => (
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
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize" style={{ background: "rgba(201,146,42,0.1)", color: "var(--gold-primary)" }}>{p.category}</span>
                    </td>
                    <td className="px-4 py-3"><span className="font-bold gold-text">{formatPrice(p.price)}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStock(p)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: p.in_stock ? "#22c55e" : "#ef4444" }}>
                        {p.in_stock ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {p.in_stock ? "In Stock" : "Out"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFeatured(p)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: p.featured ? "var(--gold-primary)" : "var(--text-muted)" }}>
                        <Sparkles className="w-4 h-4" />{p.featured ? "Yes" : "No"}
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
        </>
      )}

      {/* ── DISCOUNTS TAB ── */}
      {tab === "discounts" && (
        <div className="space-y-8">
          {/* Add discount form */}
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
                  <option value="">— All products (site-wide) —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Discount Type">
                <select value={discForm.type} onChange={(e) => setDiscForm((f) => ({ ...f, type: e.target.value as "percentage"|"fixed" }))} className="admin-input">
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

          {/* Discounts list */}
          <div>
            <h2 className="text-lg font-black mb-4" style={{ color: "var(--text-primary)" }}>Active &amp; Past Discounts</h2>
            {discounts.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No discounts yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
                <table className="w-full text-sm" style={{ background: "var(--bg-card)" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(201,146,42,0.05)" }}>
                      {["Label","Type","Value","Scope","Ends","Status",""].map((h) => (
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
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{d.ends_at ? new Date(d.ends_at).toLocaleDateString() : "—"}</td>
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
