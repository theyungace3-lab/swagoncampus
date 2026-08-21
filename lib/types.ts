export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
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
  | "bottoms"
  | "dresses"
  | "outerwear"
  | "footwear"
  | "accessories"
  | "hoodies"
  | "joggers"
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
