/**
 * Lista o referral_data salvo de todos os protocolos com type='encaminhamento'.
 * Útil pra debugar quando o gerador de justificativa parece pular itens.
 *
 * Uso: `pnpm tsx scripts/check-referral.ts`
 */

import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {}

interface ReferralNode {
  id: string;
  label: string;
  text_when_checked?: string;
  category?: string | null;
  children?: ReferralNode[];
}
interface ReferralData {
  introduction?: string;
  closing?: string;
  tree: ReferralNode[];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function dumpNode(n: ReferralNode, depth = 0) {
  const indent = "  ".repeat(depth);
  const checkText = n.text_when_checked?.trim()
    ? `text="${n.text_when_checked}"`
    : "(SEM TEXTO ⚠️)";
  console.log(
    `${indent}- [${n.category ?? "-"}] "${n.label}"  ${checkText}`,
  );
  for (const c of n.children ?? []) dumpNode(c, depth + 1);
}

async function main() {
  const { data, error } = await supabase
    .from("protocols")
    .select("id, title, slug, status, referral_data")
    .eq("type", "encaminhamento");
  if (error) {
    console.error(error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("Nenhum protocolo de encaminhamento encontrado.");
    return;
  }

  for (const p of data) {
    console.log(`\n=== ${p.title} (${p.status}) ===`);
    const ref = p.referral_data as ReferralData | null;
    if (!ref) {
      console.log("  (sem referral_data)");
      continue;
    }
    console.log(`  introduction: "${ref.introduction ?? ""}"`);
    console.log(`  closing: "${ref.closing ?? ""}"`);
    console.log(`  tree:`);
    for (const n of ref.tree ?? []) dumpNode(n, 1);
  }

  // Também conferir as versões publicadas
  console.log(`\n--- Versões publicadas dos encaminhamentos ---`);
  const ids = data.map((p) => p.id);
  if (ids.length > 0) {
    const { data: versions } = await supabase
      .from("protocol_versions")
      .select("protocol_id, version_number, is_current, graph")
      .in("protocol_id", ids);
    for (const v of versions ?? []) {
      const refInGraph = (v.graph as { referral_data?: ReferralData })
        ?.referral_data;
      console.log(
        `  protocol ${v.protocol_id.slice(0, 8)} v${v.version_number} (current=${v.is_current})`,
      );
      if (refInGraph) {
        for (const n of refInGraph.tree ?? []) dumpNode(n, 2);
      } else {
        console.log("    (snapshot sem referral_data)");
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
