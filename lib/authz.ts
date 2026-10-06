// Server-only authorization helper. Resolves who is calling an API route.
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/vendor";
import type { User } from "@supabase/supabase-js";

export interface Caller {
  user: User | null;
  isOwner: boolean;
  isVendor: boolean;
  role: Role;
}

/**
 * The owner is the store email (NEXT_PUBLIC_ADMIN_EMAIL).
 * A vendor is a signed-in user whose profile role is 'vendor'.
 * Everyone else is a customer.
 */
export async function getCaller(): Promise<Caller> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isOwner: false, isVendor: false, role: "customer" };
  }

  const ownerEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const isOwner = !!ownerEmail && user.email?.toLowerCase() === ownerEmail;

  if (isOwner) {
    return { user, isOwner: true, isVendor: false, role: "admin" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role: Role = (data as { role?: string } | null)?.role === "vendor" ? "vendor" : "customer";
  return { user, isOwner: false, isVendor: role === "vendor", role };
}
