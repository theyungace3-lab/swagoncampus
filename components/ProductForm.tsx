"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Check, ImagePlus, Package, ToggleLeft, ToggleRight, X } from "lucide-react";
import { CATEGORY_SECTIONS, formatPrice } from "@/lib/products";
import { OWNER_MARKUP, storePrice } from "@/lib/vendor";
import type { Category } from "@/lib/types";

const SIZE_OPTIONS = ["XS","S","M","L","XL","XXL","One Size","28","30","32","34","36","38","39","40","41","42","43","44"];
const COLOR_OPTIONS = ["White","Black","Grey","Navy","Brown","Beige","Blue","Red","Green","Pink","Gold","Olive","Sage","Khaki"];

export interface ProductFormValues {
  name: string;
  description: string;
  category: Category;
  image: string;
  sizes: string[];
  colors: string[];
  in_stock: boolean;
  featured: boolean;
  price: number;
  vendor_price: number;
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "", description: "", category: "tops", image: "",
  sizes: [], colors: [], in_stock: true, featured: false, price: 0, vendor_price: 0,
};

/**
 * Shared add/edit form for the owner and vendor panels.
 * `pricingMode` decides whether the price field is the store price (owner
 * products) or the vendor's own price (markup is added by the server).
 */
export function ProductForm({
  mode, title, initial, pricingMode, viewerIsVendor, showFeatured, onSubmit, onCancel,
}: {
  mode: "add" | "edit";
  title: string;
  initial: ProductFormValues;
  pricingMode: "store" | "vendor";
  viewerIsVendor: boolean;
  showFeatured: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProductFormValues>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File) {
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file (jpg, png, webp, etc.).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((f) => ({ ...f, image: data.url as string }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const toggleSize = (s: string) =>
    setForm((f) => ({ ...f, sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s] }));
  const toggleColor = (c: string) =>
    setForm((f) => ({ ...f, colors: f.colors.includes(c) ? f.colors.filter((x) => x !== c) : [...f.colors, c] }));

  async function handleSave() {
    if (!form.name.trim())   { setError("Name is required."); return; }
    if (!form.image.trim())  { setError("Image is required."); return; }
    if (!form.sizes.length)  { setError("Select at least one size."); return; }
    if (!form.colors.length) { setError("Select at least one color."); return; }
    if (pricingMode === "vendor" && form.vendor_price <= 0) { setError("Your price must be greater than 0."); return; }
    if (pricingMode === "store" && form.price <= 0)         { setError("Price must be greater than 0."); return; }

    setError("");
    setSaving(true);
    const common = {
      name: form.name,
      description: form.description,
      category: String(form.category),
      image: form.image,
      sizes: form.sizes,
      colors: form.colors,
      in_stock: form.in_stock,
    };
    const payload =
      pricingMode === "vendor"
        ? { ...common, vendor_price: form.vendor_price, ...(showFeatured ? { featured: form.featured } : {}) }
        : { ...common, price: form.price, featured: form.featured };

    try {
      await onSubmit(payload);
      setSaved(true);
      setTimeout(onCancel, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onCancel} className="p-2 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors" style={{ color: "var(--text-muted)" }} aria-label="Back">
          <X className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black gold-text">{title}</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>All fields marked * are required</p>
        </div>
      </div>
      <hr className="gold-divider mb-8" />

      <div className="luxury-card p-6 space-y-6">
        <Field label="Product Name" required>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Campus Hoodie" className="admin-input" />
        </Field>

        <Field label="Category" required>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))} className="admin-input">
            <optgroup label="Men">
              {CATEGORY_SECTIONS.men.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </optgroup>
            <optgroup label="Women">
              {CATEGORY_SECTIONS.women.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </optgroup>
          </select>
        </Field>

        {pricingMode === "vendor" ? (
          <Field
            label={viewerIsVendor ? "Your Price (₦)" : "Vendor Price (₦)"}
            required
            hint={`${viewerIsVendor ? "The store adds" : "Includes the store's"} ${formatPrice(OWNER_MARKUP)} fee. Customers pay ${formatPrice(storePrice(form.vendor_price || 0))}.`}
          >
            <input type="number" min={0} value={form.vendor_price || ""} onChange={(e) => setForm((f) => ({ ...f, vendor_price: Number(e.target.value) }))} placeholder="e.g. 6000" className="admin-input" />
          </Field>
        ) : (
          <Field label="Price (₦)" required>
            <input type="number" min={0} value={form.price || ""} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} placeholder="e.g. 6500" className="admin-input" />
          </Field>
        )}

        <Field label="Product Image" required hint="Upload a photo from your device, or paste a direct image URL below">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) handleImageFile(file); }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            className="relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl px-4 py-8 cursor-pointer transition-all"
            style={{ borderColor: dragOver ? "var(--gold-primary)" : "var(--border-color)", background: dragOver ? "rgba(201,146,42,0.06)" : "var(--bg-secondary)" }}
            aria-label="Upload product image"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageFile(file); }}
            />
            {uploading ? (
              <>
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--gold-primary)", borderTopColor: "transparent" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Uploading image…</p>
              </>
            ) : form.image ? (
              <>
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-color)" }}>
                  <Image src={form.image} alt="Preview" fill sizes="96px" className="object-cover" />
                </div>
                <p className="text-xs font-semibold" style={{ color: "var(--gold-primary)" }}>Click or drop a new image to replace</p>
              </>
            ) : (
              <>
                <ImagePlus className="w-8 h-8 animate-gentle-bounce" style={{ color: "var(--gold-primary)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Click to upload or drag &amp; drop</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>JPG, PNG or WebP, up to 5MB</p>
              </>
            )}
          </div>

          {uploadError && <p className="text-xs text-red-500 mt-2">{uploadError}</p>}

          <details className="mt-3">
            <summary className="text-xs font-semibold cursor-pointer select-none" style={{ color: "var(--text-muted)" }}>Or paste an image URL instead</summary>
            <input type="url" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="https://.../product.jpg" className="admin-input mt-2" />
          </details>
        </Field>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="admin-input resize-none" placeholder="Brief product description…" />
        </Field>

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

        <div className={`grid gap-4 ${showFeatured ? "grid-cols-2" : "grid-cols-1"}`}>
          <Field label="In Stock">
            <button type="button" onClick={() => setForm((f) => ({ ...f, in_stock: !f.in_stock }))} className="flex items-center gap-2 text-sm font-semibold" style={{ color: form.in_stock ? "#22c55e" : "#ef4444" }} aria-pressed={form.in_stock}>
              {form.in_stock ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              {form.in_stock ? "Yes" : "No"}
            </button>
          </Field>
          {showFeatured && (
            <Field label="Featured">
              <button type="button" onClick={() => setForm((f) => ({ ...f, featured: !f.featured }))} className="flex items-center gap-2 text-sm font-semibold" style={{ color: form.featured ? "var(--gold-primary)" : "var(--text-muted)" }} aria-pressed={form.featured}>
                {form.featured ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                {form.featured ? "Yes" : "No"}
              </button>
            </Field>
          )}
        </div>

        {error && <div role="alert" className="px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 btn-ghost-gold py-3 rounded-full font-bold text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold text-sm disabled:opacity-60" style={{ flex: 2 }}>
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? "Saving…" : <><Package className="w-4 h-4" /> {mode === "add" ? "Add Product" : "Save Changes"}</>}
          </button>
        </div>
      </div>
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
