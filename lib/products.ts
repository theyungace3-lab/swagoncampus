import { Product, Category } from "./types";

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Classic White Tee",
    price: 3500,
    category: "tops",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
    description: "Premium cotton crew-neck tee, perfect for campus life.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["White", "Black", "Grey"],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Baggy Cargo Jeans",
    price: 8500,
    category: "bottoms",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80",
    description: "Relaxed-fit cargo jeans with multiple pockets.",
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["Blue", "Black", "Khaki"],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Campus Hoodie",
    price: 6500,
    category: "hoodies",
    image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80",
    description: "Cozy fleece hoodie for cool FUNAAB evenings.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Navy", "Brown"],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Floral Midi Dress",
    price: 7200,
    category: "dresses",
    image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80",
    description: "Elegant floral midi dress for lectures and events.",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Floral Red", "Floral Blue"],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Varsity Jacket",
    price: 12000,
    category: "outerwear",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80",
    description: "Classic varsity jacket to flex on campus.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black/Gold", "Navy/White"],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "6",
    name: "White Chunky Sneakers",
    price: 9500,
    category: "footwear",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    description: "Chunky sole sneakers for that drip look.",
    sizes: ["38", "39", "40", "41", "42", "43", "44"],
    colors: ["White", "Triple Black"],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "7",
    name: "Jogger Sweatpants",
    price: 4800,
    category: "joggers",
    image: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&q=80",
    description: "Comfortable tapered joggers for everyday wear.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Grey", "Black", "Olive"],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "8",
    name: "Gold Chain Necklace",
    price: 2500,
    category: "accessories",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80",
    description: "Stainless steel gold-plated chain necklace.",
    sizes: ["One Size"],
    colors: ["Gold", "Silver"],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "9",
    name: "Oversized Graphic Tee",
    price: 4200,
    category: "tops",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80",
    description: "Oversized fit with exclusive campus graphic prints.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Black", "Beige"],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "10",
    name: "Biker Shorts",
    price: 3200,
    category: "bottoms",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4d35?w=400&q=80",
    description: "Stretchy high-waist biker shorts.",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "Brown", "Sage"],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
];

export const CATEGORIES: { id: Category; label: string; description: string }[] = [
  { id: "tops", label: "Tops", description: "T-shirts, shirts & more" },
  { id: "bottoms", label: "Bottoms", description: "Jeans, shorts & trousers" },
  { id: "dresses", label: "Dresses", description: "Casual & formal dresses" },
  { id: "outerwear", label: "Outerwear", description: "Jackets & coats" },
  { id: "hoodies", label: "Hoodies", description: "Sweatshirts & hoodies" },
  { id: "joggers", label: "Joggers", description: "Sweatpants & joggers" },
  { id: "footwear", label: "Footwear", description: "Sneakers & shoes" },
  { id: "accessories", label: "Accessories", description: "Bags, jewelry & more" },
];

export function getProductsFromStorage(): Product[] {
  if (typeof window === "undefined") return SAMPLE_PRODUCTS;
  try {
    const stored = localStorage.getItem("soc_products");
    if (stored) {
      const parsed = JSON.parse(stored) as Product[];
      return parsed.length > 0 ? parsed : SAMPLE_PRODUCTS;
    }
  } catch {
    // ignore
  }
  return SAMPLE_PRODUCTS;
}

export function saveProductsToStorage(products: Product[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("soc_products", JSON.stringify(products));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);
}
