"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import {
  Lock,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Sparkles,
  Package,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
} from "lucide-react";
import { useProducts } from "@/contexts/ProductsContext";
import { Product, Category } from "@/lib/types";
import { CATEGORIES, formatPrice } from "@/lib/products";

// ── Admin password (stored client-side; for a real app use server auth) ──
const ADMIN_PASSWORD = "swagadmin2025";

// ── Default empty form ──
const EMPTY_FORM: Omit<Product, "id" | "createdAt"> = {
  name: "",
  price: 0,
  category: "tops",
  image: "",
  description: "",
  sizes: [],
  colors: [],
  inStock: true,
  featured: false,
};

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size", "28", "30", "32", "34", "36", "38", "39", "40", "41", "42", "43", "44"];
const COLOR_OPTIONS = ["White", "Black", "Grey", "Navy", "Brown", "Beige", "Blue", "Red", "Green", "Pink", "Gold", "Olive", "Sage", "Khaki"];

export function AdminClient() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const { products, addProduct, updateProduct, deleteProduct, resetToSample } = useProducts();
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Product, "id" | "createdAt">>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");

  // ── Login ──
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Incorrect password. Try again.");
    }
  }

  // ── Form helpers ──
  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setView("add");
  }

  function startEdit(product: Product) {
    setForm({
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      description: product.description,
      sizes: [...product.sizes],
      colors: [...product.colors],
      inStock: product.inStock,
      featured: product.featured ?? false,
    });
    setEditingId(product.id);
    setFormError("");
    setView("edit");
  }

  function toggleSize(size: string) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  }

  function toggleColor(color: string) {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter((c) => c !== color)
        : [...prev.colors, color],
    }));
  }

  function addCustomSize() {
    const s = customSize.trim();
    if (s && !form.sizes.includes(s)) {
      setForm((prev) => ({ ...prev, sizes: [...prev.sizes, s] }));
    }
    setCustomSize("");
  }

  function addCustomColor() {
    const c = customColor.trim();
    if (c && !form.colors.includes(c)) {
      setForm((prev) => ({ ...prev, colors: [...prev.colors, c] }));
    }
    setCustomColor("");
  }

  function validateForm(): boolean {
    if (!form.name.trim()) { setFormError("Product name is required."); return false; }
    if (form.price <= 0) { setFormError("Price must be greater than 0."); return false; }
    if (!form.image.trim()) { setFormError("Image URL is required."); return false; }
    if (form.sizes.length === 0) { setFormError("Select at least one size."); return false; }
    if (form.colors.length === 0) { setFormError("Select at least one color."); return false; }
    setFormError("");
    return true;
  }

  function handleSave() {
    if (!validateForm()) return;
    if (view === "add") {
      addProduct(form);
    } else if (view === "edit" && editingId) {
      updateProduct(editingId, form);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setView("list");
    }, 1200);
  }

  function handleDelete(id: string) {
    if (deleteConfirm === id) {
      deleteProduct(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }

  // ── Login Screen ──
  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="luxury-card p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(201,146,42,0.12)", border: "1px solid var(--border-color)" }}
              >
                <Lock className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
              </div>
              <h1 className="text-2xl font-black gold-text">Admin Panel</h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                SwagOnCampus Management
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border outline-none text-sm transition-all focus:border-[var(--gold-primary)]"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: loginError ? "#ef4444" : "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: "var(--text-muted)" }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginError && (
                  <p className="text-xs text-red-500 mt-1.5">{loginError}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn-gold w-full py-3 rounded-full font-bold text-sm"
              >
                Log In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ──
  if (view === "list") {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5" style={{ color: "var(--gold-primary)" }} />
              <h1 className="text-3xl font-black gold-text">Admin Panel</h1>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {products.length} product{products.length !== 1 ? "s" : ""} in store
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetToSample}
              className="btn-ghost-gold px-4 py-2 rounded-full text-xs font-bold"
            >
              Reset to Sample
            </button>
            <button
              onClick={startAdd}
              className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
            <button
              onClick={() => setAuthenticated(false)}
              className="p-2.5 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors"
              style={{ color: "var(--text-muted)" }}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <hr className="gold-divider mb-8" />

        {/* Products Table */}
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border-color)" }}>
          <table className="w-full text-sm" style={{ background: "var(--bg-card)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(201,146,42,0.05)" }}>
                {["Image", "Name", "Category", "Price", "Stock", "Featured", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b last:border-b-0 hover:bg-[rgba(201,146,42,0.03)] transition-colors"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <td className="px-4 py-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold max-w-[180px] truncate" style={{ color: "var(--text-primary)" }}>
                      {product.name}
                    </p>
                    <p className="text-xs mt-0.5 max-w-[180px] truncate" style={{ color: "var(--text-muted)" }}>
                      {product.sizes.join(", ")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                      style={{ background: "rgba(201,146,42,0.1)", color: "var(--gold-primary)" }}
                    >
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold gold-text">{formatPrice(product.price)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateProduct(product.id, { inStock: !product.inStock })}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: product.inStock ? "#22c55e" : "#ef4444" }}
                      aria-label={product.inStock ? "Mark as out of stock" : "Mark as in stock"}
                    >
                      {product.inStock ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                      {product.inStock ? "In Stock" : "Out of Stock"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateProduct(product.id, { featured: !product.featured })}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: product.featured ? "var(--gold-primary)" : "var(--text-muted)" }}
                      aria-label={product.featured ? "Remove from featured" : "Mark as featured"}
                    >
                      <Sparkles className="w-4 h-4" />
                      {product.featured ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(product)}
                        className="p-1.5 rounded-lg hover:bg-[rgba(201,146,42,0.1)] transition-colors"
                        style={{ color: "var(--gold-primary)" }}
                        aria-label={`Edit ${product.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          deleteConfirm === product.id
                            ? "bg-red-500 text-white"
                            : "hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                        }`}
                        aria-label={deleteConfirm === product.id ? "Confirm delete" : `Delete ${product.name}`}
                        title={deleteConfirm === product.id ? "Click again to confirm" : "Delete"}
                      >
                        {deleteConfirm === product.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Add / Edit Form ──
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setView("list")}
          className="p-2 rounded-full hover:bg-[rgba(201,146,42,0.1)] transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label="Back to product list"
        >
          <X className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black gold-text">
            {view === "add" ? "Add New Product" : "Edit Product"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {view === "add" ? "Fill in the details below" : "Update product information"}
          </p>
        </div>
      </div>

      <hr className="gold-divider mb-8" />

      <div className="luxury-card p-6 space-y-6">
        {/* Name */}
        <FormField label="Product Name" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Classic White Tee"
            className="admin-input"
          />
        </FormField>

        {/* Category */}
        <FormField label="Category" required>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
            className="admin-input"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Price */}
        <FormField label="Price (₦)" required>
          <input
            type="number"
            min={0}
            value={form.price || ""}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            placeholder="e.g. 4500"
            className="admin-input"
          />
        </FormField>

        {/* Image URL */}
        <FormField label="Image URL" required hint="Paste a direct image URL (e.g. from Unsplash)">
          <input
            type="url"
            value={form.image}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
            placeholder="https://images.unsplash.com/..."
            className="admin-input"
          />
          {/* Preview */}
          {form.image && (
            <div className="mt-3 relative w-24 h-24 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-color)" }}>
              <Image
                src={form.image}
                alt="Preview"
                fill
                sizes="96px"
                className="object-cover"
                onError={() => {}}
              />
            </div>
          )}
        </FormField>

        {/* Description */}
        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of the product..."
            rows={3}
            className="admin-input resize-none"
          />
        </FormField>

        {/* Sizes */}
        <FormField label="Sizes" required>
          <div className="flex flex-wrap gap-2 mb-3">
            {SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  form.sizes.includes(size) ? "btn-gold border-transparent" : "btn-ghost-gold"
                }`}
                aria-pressed={form.sizes.includes(size)}
              >
                {size}
              </button>
            ))}
          </div>
          {/* Custom size input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSize(); } }}
              placeholder="Custom size (e.g. 3XL)"
              className="admin-input flex-1 text-xs py-2"
            />
            <button
              type="button"
              onClick={addCustomSize}
              className="btn-ghost-gold px-3 py-2 rounded-full text-xs font-bold"
            >
              Add
            </button>
          </div>
          {form.sizes.length > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Selected: {form.sizes.join(", ")}
            </p>
          )}
        </FormField>

        {/* Colors */}
        <FormField label="Colors" required>
          <div className="flex flex-wrap gap-2 mb-3">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  form.colors.includes(color) ? "btn-gold border-transparent" : "btn-ghost-gold"
                }`}
                aria-pressed={form.colors.includes(color)}
              >
                {color}
              </button>
            ))}
          </div>
          {/* Custom color */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomColor(); } }}
              placeholder="Custom color (e.g. Mustard Yellow)"
              className="admin-input flex-1 text-xs py-2"
            />
            <button
              type="button"
              onClick={addCustomColor}
              className="btn-ghost-gold px-3 py-2 rounded-full text-xs font-bold"
            >
              Add
            </button>
          </div>
          {form.colors.length > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Selected: {form.colors.join(", ")}
            </p>
          )}
        </FormField>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="In Stock">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, inStock: !f.inStock }))}
              className="flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: form.inStock ? "#22c55e" : "#ef4444" }}
              aria-pressed={form.inStock}
            >
              {form.inStock ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              {form.inStock ? "Yes" : "No"}
            </button>
          </FormField>

          <FormField label="Featured">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, featured: !f.featured }))}
              className="flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: form.featured ? "var(--gold-primary)" : "var(--text-muted)" }}
              aria-pressed={form.featured}
            >
              {form.featured ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              {form.featured ? "Yes" : "No"}
            </button>
          </FormField>
        </div>

        {/* Error */}
        {formError && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
            {formError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setView("list")}
            className="flex-1 btn-ghost-gold py-3 rounded-full font-bold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-2 btn-gold flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold text-sm"
            style={{ flex: 2 }}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                {view === "add" ? "Add Product" : "Save Changes"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small helper component ──
function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && (
        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}
