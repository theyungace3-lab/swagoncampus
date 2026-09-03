// Untyped admin Supabase client for server-side mutations
// Uses service role key — never import this in client components
import { createClient } from "@supabase/supabase-js";

export function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder"
  );
}
