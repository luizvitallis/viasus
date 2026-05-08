/**
 * Inspeciona o `content` JSONB de cada nó pra detectar se o link foi
 * salvo como mark ou ficou texto puro.
 *
 * Uso: `pnpm tsx scripts/check-node-content.ts`
 */

import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TipTapNode {
  type: string;
  text?: string;
  content?: TipTapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function findLinks(doc: TipTapNode | null, path = "doc"): void {
  if (!doc) return;
  if (doc.type === "text") {
    const linkMark = doc.marks?.find((m) => m.type === "link");
    if (linkMark) {
      console.log(
        `  ✓ link mark @ ${path}: text="${doc.text}"`,
      );
      console.log(`     mark completo: ${JSON.stringify(linkMark)}`);
    } else if (doc.text && /https?:\/\//.test(doc.text)) {
      console.log(
        `  ⚠️ texto puro com URL @ ${path}: "${doc.text}" (sem link mark!)`,
      );
    }
  }
  for (const [i, child] of (doc.content ?? []).entries()) {
    findLinks(child, `${path}.content[${i}]`);
  }
}

async function main() {
  const { data: protocols } = await supabase
    .from("protocols")
    .select("id, title, slug")
    .eq("status", "published");

  if (!protocols || protocols.length === 0) {
    console.log("Nenhum protocolo publicado");
    return;
  }

  for (const p of protocols) {
    const { data: nodes } = await supabase
      .from("nodes")
      .select("id, label, content")
      .eq("protocol_id", p.id);

    console.log(`\n=== ${p.title} (slug: ${p.slug}) ===`);
    for (const n of nodes ?? []) {
      const content = n.content as TipTapNode | null;
      if (!content || (Array.isArray(content.content) && content.content.length === 0)) {
        continue;
      }
      console.log(`\n[${n.id.slice(0, 8)}] "${n.label}"`);
      findLinks(content);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
