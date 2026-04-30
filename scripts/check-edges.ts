/**
 * Diagnóstico rápido — conta nós/arestas atuais do protocolo seed.
 * Uso: `pnpm tsx scripts/check-edges.ts`
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient<Database>(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PROTO = "22222222-0000-0000-0000-000000000001";

async function main() {
  const { data: nodes } = await supabase
    .from("nodes")
    .select("id, type, label")
    .eq("protocol_id", PROTO);
  const { data: edges } = await supabase
    .from("edges")
    .select("id, source_node_id, target_node_id, label, style")
    .eq("protocol_id", PROTO);
  const { data: versions } = await supabase
    .from("protocol_versions")
    .select("version_number, is_current, published_at")
    .eq("protocol_id", PROTO)
    .order("version_number", { ascending: true });

  console.log(`Nós no banco: ${nodes?.length ?? 0}`);
  for (const n of nodes ?? [])
    console.log(`  ${n.id.slice(0, 8)} · ${n.type} · "${n.label}"`);

  console.log(`\nArestas no banco: ${edges?.length ?? 0}`);
  for (const e of edges ?? []) {
    const src = e.source_node_id.slice(0, 8);
    const tgt = e.target_node_id.slice(0, 8);
    console.log(
      `  ${e.id.slice(0, 8)} · ${src} → ${tgt} · ${e.style} · "${e.label ?? "—"}"`,
    );
  }

  console.log(`\nVersões publicadas: ${versions?.length ?? 0}`);
  for (const v of versions ?? []) {
    console.log(
      `  v${v.version_number} ${v.is_current ? "(current)" : ""} · ${v.published_at}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
