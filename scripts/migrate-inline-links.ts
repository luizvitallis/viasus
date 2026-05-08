/**
 * Migra link marks inline do TipTap pra a nova coluna structured `links`.
 *
 * Pra cada nó:
 *   1. Encontra todos os link marks no content (com href válido http(s))
 *   2. Adiciona cada um como entry { id, label, url } em nodes.links
 *      (preservando entries já existentes; dedupe por URL)
 *   3. Remove apenas o MARK do texto (mantém o texto da URL inline como
 *      texto puro — assim não perde nada visualmente, e o card no viewer
 *      complementa)
 *
 * Idempotente: rodar várias vezes não dá problema (skip se URL já estiver
 * em links).
 *
 * Uso: `pnpm tsx scripts/migrate-inline-links.ts`
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

interface NodeLink {
  id: string;
  label: string;
  url: string;
}

const URL_RE = /^https?:\/\//i;

function extractLinks(doc: TipTapNode | null): NodeLink[] {
  const links: NodeLink[] = [];
  if (!doc) return links;
  function walk(n: TipTapNode) {
    if (n.type === "text" && n.marks) {
      for (const mark of n.marks) {
        if (mark.type !== "link") continue;
        const hrefAttr = mark.attrs?.href;
        const text = (n.text ?? "").trim();
        // Tenta extrair URL: 1) do attrs.href, 2) do próprio text quando
        // o text é uma URL (link mark "quebrado" sem href)
        const candidate =
          typeof hrefAttr === "string" && URL_RE.test(hrefAttr.trim())
            ? hrefAttr.trim()
            : URL_RE.test(text)
              ? text
              : null;
        if (!candidate) continue;
        const label =
          text.length > 0 && text.length <= 100
            ? text
            : candidate.length <= 100
              ? candidate
              : candidate.slice(0, 100);
        links.push({
          id: crypto.randomUUID(),
          label,
          url: candidate,
        });
      }
    }
    for (const child of n.content ?? []) walk(child);
  }
  walk(doc);
  return links;
}

function stripLinkMarks(doc: TipTapNode): TipTapNode {
  const next: TipTapNode = { ...doc };
  if (doc.marks) {
    next.marks = doc.marks.filter((m) => m.type !== "link");
    if (next.marks.length === 0) delete next.marks;
  }
  if (doc.content) {
    next.content = doc.content.map(stripLinkMarks);
  }
  return next;
}

async function main() {
  const { data: nodes, error } = await supabase
    .from("nodes")
    .select("id, label, content, links");
  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (!nodes) return;

  let totalMigrated = 0;
  let totalLinksAdded = 0;
  for (const n of nodes) {
    const content = n.content as TipTapNode | null;
    if (!content) continue;

    const inlineLinks = extractLinks(content);
    if (inlineLinks.length === 0) continue;

    // Merge com links estruturados já existentes; dedupe por URL
    const existing: NodeLink[] = Array.isArray(n.links)
      ? (n.links as NodeLink[])
      : [];
    const byUrl = new Map(existing.map((l) => [l.url, l]));
    let added = 0;
    for (const link of inlineLinks) {
      if (!byUrl.has(link.url)) {
        byUrl.set(link.url, link);
        added++;
      }
    }
    if (added === 0) continue;

    const mergedLinks = Array.from(byUrl.values());
    const cleanContent = stripLinkMarks(content);

    const { error: upErr } = await supabase
      .from("nodes")
      .update({
        content: cleanContent as never,
        links: mergedLinks as never,
      })
      .eq("id", n.id);
    if (upErr) {
      console.error(`✖ falhou em "${n.label}":`, upErr.message);
      continue;
    }

    console.log(
      `  ✓ "${n.label}" (${n.id.slice(0, 8)}): +${added} link(s) estruturado(s)`,
    );
    for (const l of inlineLinks) console.log(`     → ${l.url}`);
    totalMigrated++;
    totalLinksAdded += added;
  }

  console.log(
    `\n✔ ${totalMigrated} nó(s) migrado(s), total ${totalLinksAdded} link(s) adicionados.`,
  );
  if (totalMigrated > 0) {
    console.log("Lembre de RE-PUBLICAR os protocolos afetados.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
