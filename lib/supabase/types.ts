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
      analytics_events: {
        Row: {
          id: string;
          type: AnalyticsEventType;
          visitor_id: string;
          path: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["analytics_events"]["Row"], "id" | "created_at" | "user_id"> & {
          id?: string;
          user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["analytics_events"]["Insert"]>;
      };
    };
  };
};

// Single source for analytics event types. The API whitelist and the SQL
// check constraint must cover exactly these values.
export const ANALYTICS_EVENT_TYPES = [
  "pageview",
  "whatsapp_click",
  "checkout_start",
  "add_to_cart",
  "heartbeat",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export interface HourlyBucket {
  bucket: string;
  pageviews: number;
  whatsapp: number;
}

export interface TopPage {
  path: string;
  views: number;
}

export interface RecentEvent {
  id: string;
  type: Exclude<AnalyticsEventType, "heartbeat">;
  path: string;
  created_at: string;
}

export interface AnalyticsSummary {
  schemaVersion: 1;
  generatedAt: string;
  visitors: number;
  visitorsToday: number;
  visitorsLive: number;
  pageviews: number;
  pageviewsToday: number;
  pageviewsLive: number;
  accounts: number;
  accountsToday: number;
  accounts7d: number;
  checkouts: number;
  checkoutsToday: number;
  checkoutsLive: number;
  checkoutClicks: number;
  checkoutClicksToday: number;
  whatsapp: number;
  whatsappToday: number;
  whatsappLive: number;
  whatsappVisitorsToday: number;
  cartAdds: number;
  cartAddsToday: number;
  cartVisitorsToday: number;
  orders: number;
  ordersToday: number;
  orders7d: number;
  hourly: HourlyBucket[];
  topPages: TopPage[];
  recent: RecentEvent[];
}

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
export type DbAnalyticsEvent = Database["public"]["Tables"]["analytics_events"]["Row"];
