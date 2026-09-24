export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category | LegacyCategory;
  image: string;
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  featured?: boolean;
  createdAt: string;
}

export type Category =
  | "tops"
  | "jackets-hoodies"
  | "trousers-jeans"
  | "footwear"
  | "watches-accessories"
  | "corporate-dresses";

// Legacy category values that may still exist in the database
export type LegacyCategory =
  | "bottoms"
  | "dresses"
  | "outerwear"
  | "hoodies"
  | "joggers"
  | "accessories"
  | "longsleeves";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  category: Category;
  image: string;
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  featured: boolean;
  createdAt: string;
}
