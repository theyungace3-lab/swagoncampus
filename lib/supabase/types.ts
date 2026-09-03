// Auto-generated shape for our Supabase tables
export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          category: string;
          image: string;
          sizes: string[];
          colors: string[];
          in_stock: boolean;
          featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      discounts: {
        Row: {
          id: string;
          product_id: string | null;
          label: string;
          type: "percentage" | "fixed";
          value: number;
          active: boolean;
          starts_at: string;
          ends_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["discounts"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["discounts"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          hostel: string;
          role: "customer" | "admin";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at"> & { id: string };
        Update: Partial<Omit<Database["public"]["Tables"]["profiles"]["Row"], "id" | "created_at">>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          items: OrderItem[];
          total: number;
          status: "pending" | "confirmed" | "delivered" | "cancelled";
          whatsapp_ref: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
    };
  };
};

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
}

// Convenience type aliases
export type DbProduct  = Database["public"]["Tables"]["products"]["Row"];
export type DbDiscount = Database["public"]["Tables"]["discounts"]["Row"];
export type DbProfile  = Database["public"]["Tables"]["profiles"]["Row"];
export type DbOrder    = Database["public"]["Tables"]["orders"]["Row"];
