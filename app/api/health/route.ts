import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Smoke test público — confirma que o servidor consegue falar com o Postgres.
 * Conta `tenants` com a key anon. Se RLS estiver correta e não houver usuário
 * autenticado, deve retornar 0 (sem vazamento) e ainda assim 200 OK.
 *
 * Útil para uptime checks (Vercel/UptimeRobot) e validação pós-deploy.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("tenants")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          status: "error",
          message: error.message,
          code: error.code,
          latency_ms: Date.now() - startedAt,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      tenants_visible_anon: count ?? 0,
      latency_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { status: "error", message, latency_ms: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
