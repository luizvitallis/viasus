import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Cliente Supabase com a `secret key` (service_role-equivalent).
 *
 * USAR APENAS em server actions e route handlers privilegiados quando for
 * estritamente necessário ignorar RLS — por exemplo, criação de auth user
 * via admin API. Nunca exportar pra browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
