/**
 * Conserta link marks sem href no content JSONB dos nós.
 *
 * Cria-se um link mark quebrado quando o StarterKit duplicado (v3) ou
 * uma config inconsistente fazia o ProseMirror salvar `{"type":"link"}`
 * sem `attrs.href`. Esse script percorre o content de cada nó, encontra
 * essas marks, e seta `attrs.href` igual ao texto (quando o texto é uma
 * URL).
 *
 * Uso: `pnpm tsx scripts/fix-broken-links.ts`
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

const URL_RE = /^https?:\/\/\S+$/i;

/** Mutates the doc tree, fixing any link marks without href. Returns true if any change made. */
function fixLinks(doc: TipTapNode): boolean {
  let changed = false;
  if (doc.type === "text" && doc.marks) {
    for (const mark of doc.marks) {
      if (mark.type === "link") {
        const href = mark.attrs?.href;
        if (!href || typeof href !== "string" || href.trim() === "") {
          if (doc.text && URL_RE.test(doc.text.trim())) {
            mark.attrs = {
              ...(mark.attrs ?? {}),
              href: doc.text.trim(),
              target: "_blank",
              rel: "noopener noreferrer nofollow",
            };
            changed = true;
          } else {
            // Remove a mark de link inválida (texto não é URL)
            doc.marks = doc.marks.filter((m) => m !== mark);
            changed = true;
          }
        }
      }
    }
  }
  for (const child of doc.content ?? []) {
    if (fixLinks(child)) changed = true;
  }
  return changed;
}

async function main() {
  const { data: nodes, error } = await supabase
    .from("nodes")
    .select("id, label, content, protocol_id");
  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (!nodes) return;

  let totalFixed = 0;
  for (const n of nodes) {
    const content = n.content as TipTapNode | null;
    if (!content) continue;
    const changed = fixLinks(content);
    if (changed) {
      console.log(`  ✓ corrigindo nó "${n.label}" (${n.id.slice(0, 8)})`);
      const { error: upErr } = await supabase
        .from("nodes")
        .update({ content: content as never })
        .eq("id", n.id);
      if (upErr) {
        console.error(`    falhou: ${upErr.message}`);
      } else {
        totalFixed++;
      }
    }
  }

  console.log(`\nTotal corrigido: ${totalFixed} nó(s).`);
  if (totalFixed > 0) {
    console.log(
      "Lembre de RE-PUBLICAR os protocolos afetados pra o snapshot atualizar.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
