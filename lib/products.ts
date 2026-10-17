import { Category, Section } from "./types";

export const CATEGORIES: { id: Category; label: string; description: string; section: Section }[] = [
  { id: "tops", label: "Tops", description: "T-shirts, shirts & more", section: "men" },
  { id: "jackets-hoodies", label: "Jackets & Hoodies", description: "Jackets, hoodies & sweatshirts", section: "men" },
  { id: "trousers-jeans", label: "Trousers & Jeans", description: "Jeans, trousers & joggers", section: "men" },
  { id: "footwear", label: "Footwear", description: "Sneakers & shoes", section: "men" },
  { id: "watches-accessories", label: "Wristwatches, Caps & Accessories", description: "Watches, caps, chains & more", section: "men" },
  { id: "corporate-dresses", label: "Corporate Dresses", description: "Formal & office wear", section: "men" },
  { id: "campus-casual", label: "Campus Casual", description: "Graphic tees, oversized hoodies, denim & cargos", section: "women" },
  { id: "going-out", label: "Going Out & Social", description: "Bodysuits, crop tops, corsets, skirts & dresses", section: "women" },
  { id: "athleisure", label: "Athleisure & Loungewear", description: "Leggings, biker shorts, sports bras & sweat sets", section: "women" },
  { id: "smart-casual", label: "Smart Casual & Career", description: "Blazers, dress trousers, slip dresses & button-downs", section: "women" },
  { id: "womens-outerwear", label: "Outerwear", description: "Denim & faux-leather jackets, puffers & trench coats", section: "women" },
  { id: "accessories-footwear", label: "Accessories & Footwear", description: "Sneakers, boots, totes, backpacks & jewelry", section: "women" },
];

export const CATEGORY_SECTIONS: Record<Section, typeof CATEGORIES> = {
  men: CATEGORIES.filter((c) => c.section === "men"),
  women: CATEGORIES.filter((c) => c.section === "women"),
};

// Legacy database values → current category
const LEGACY_CATEGORY_MAP: Record<string, Category> = {
  tops: "tops",
  longsleeves: "tops",
  hoodies: "jackets-hoodies",
  outerwear: "jackets-hoodies",
  bottoms: "trousers-jeans",
  joggers: "trousers-jeans",
  footwear: "footwear",
  accessories: "watches-accessories",
  dresses: "corporate-dresses",
};

export const CURRENT_CATEGORIES: Category[] = CATEGORIES.map((c) => c.id);

// Map any stored value (new or legacy) to a current category
export function normalizeCategory(raw: string): Category {
  if (LEGACY_CATEGORY_MAP[raw]) return LEGACY_CATEGORY_MAP[raw];
  return (raw as Category) || "tops";
}

// All database values (current + legacy) that belong to a given category
export function categoryDbValues(category: Category): string[] {
  const values = Object.entries(LEGACY_CATEGORY_MAP)
    .filter(([, mapped]) => mapped === category)
    .map(([stored]) => stored);
  if (!values.includes(category)) values.push(category);
  return values;
}

export function getCategoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === normalizeCategory(id))?.label ?? id;
}

// Strip em/en dashes and spaced hyphens from user-facing text
export function sanitizeDisplayText(text: string): string {
  return text
    .replace(/[\u2014\u2013]/g, "")
    .replace(/\s*-\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);
}
