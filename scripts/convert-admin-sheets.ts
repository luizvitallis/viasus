/**
 * Converte os Fluxos Administrativos (type='pop') do fluxograma antigo para a
 * ficha (`protocols.admin_data`, migration 0015) e arquiva o fluxo da criança
 * exposta ao HIV.
 *
 * Uso:
 *   pnpm tsx scripts/convert-admin-sheets.ts [relatorio.md]          # só simula
 *   pnpm tsx scripts/convert-admin-sheets.ts [relatorio.md] --apply  # grava
 *
 * Sem --apply nada é gravado: o script escreve o relatório (o que vira cada
 * fluxo, itens separados, avisos) para revisão.
 *
 * Com --apply, para cada fluxo ainda sem ficha:
 *   - grava admin_data;
 *   - se estiver publicado, cria uma versão nova com a ficha (o snapshot
 *     continua levando nodes/edges, para histórico) e registra `publish` na
 *     auditoria.
 * Os nodes/edges antigos não são apagados.
 */

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  graphToAdminSheet,
  type GraphEdge,
  type GraphNode,
} from "../lib/admin-sheet-convert";
import { adminSheetToText, countAdminItems } from "../lib/admin-sheet";

try {
  process.loadEnvFile(".env.local");
} catch {}

const APPLY = process.argv.includes("--apply");
const reportPath =
  process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  join(tmpdir(), "conversao-fichas-relatorio.md");

const ARCHIVE_TITLE = /CRIAN[ÇC]A\s+EXPOSTA\s+AO\s+HIV/i;
const NODE_COLS =
  "id, type, label, position_x, position_y, content, tags, calculator_type, links_to_protocol_id, encaminhamento_target_id, documento_categoria, documento_acao, documento_link, color_bg, color_border, links";
const EDGE_COLS = "id, source_node_id, target_node_id, label, style, condition_expr, color_stroke";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

async function main() {
  if (APPLY) {
    const probe = await supabase.from("protocols").select("admin_data").limit(1);
    if (probe.error) {
      throw new Error(
        `Coluna admin_data não encontrada — aplique supabase/migrations/0015_admin_sheet.sql no SQL Editor antes. (${probe.error.message})`,
      );
    }
  }

  const protocols = must(
    await supabase
      .from("protocols")
      .select(`id, tenant_id, title, slug, status${APPLY ? ", admin_data" : ""}`)
      .eq("type", "pop")
      .order("title"),
    "listar protocolos",
  ) as unknown as {
    id: string;
    tenant_id: string;
    title: string;
    slug: string;
    status: string;
    admin_data?: unknown;
  }[];

  const report: string[] = [
    `# Conversão dos Fluxos Administrativos para ficha`,
    ``,
    `${APPLY ? "**GRAVADO**" : "Simulação — nada foi gravado"} · ${new Date().toLocaleString("pt-BR")} · ${protocols.length} fluxos`,
    ``,
  ];
  const summary = { requisitos: 0, etapas: 0, splits: 0, published: 0, skipped: 0, archived: 0 };
  const splitLines: string[] = [];

  for (const p of protocols) {
    if (ARCHIVE_TITLE.test(p.title)) {
      report.push(`## ${p.title} — ARQUIVAR (${p.status})`, ``);
      if (APPLY && p.status !== "archived") {
        must(await supabase.from("protocols").update({ status: "archived" }).eq("id", p.id), "arquivar");
        must(
          await supabase.from("protocol_audit").insert({
            tenant_id: p.tenant_id,
            protocol_id: p.id,
            user_id: null,
            action: "archive",
            payload: { title: p.title, slug: p.slug, via: "conversao-ficha" },
          }),
          "auditoria arquivar",
        );
        summary.archived++;
      }
      continue;
    }
    if (APPLY && p.admin_data) {
      summary.skipped++;
      report.push(`## ${p.title} — já tinha ficha, mantida`, ``);
      continue;
    }

    const [nodes, edges] = await Promise.all([
      supabase.from("nodes").select(NODE_COLS).eq("protocol_id", p.id),
      supabase.from("edges").select(EDGE_COLS).eq("protocol_id", p.id),
    ]);
    const nodeRows = must(nodes, `nós de ${p.title}`) as unknown as (GraphNode & Record<string, unknown>)[];
    const edgeRows = must(edges, `arestas de ${p.title}`) as unknown as (GraphEdge & Record<string, unknown>)[];
    if (!nodeRows.length) {
      report.push(`## ${p.title} — SEM NÓS, ignorado`, ``);
      continue;
    }

    const { sheet, notes } = graphToAdminSheet(nodeRows, edgeRows);
    summary[sheet.layout]++;
    for (const n of notes.filter((x) => x.kind === "split")) {
      summary.splits++;
      splitLines.push(`- **${p.title}**: ${n.text}`);
    }

    report.push(
      `## ${p.title}`,
      ``,
      `\`${p.status}\` · ${sheet.layout} · ${countAdminItems(sheet)} itens · /${p.slug}`,
      ``,
      ...notes.filter((n) => n.kind !== "split").map((n) => `> ${n.kind === "dropped" ? "⚠️" : "ℹ️"} ${n.text}`),
      ``,
      "```",
      adminSheetToText(p.title, sheet),
      "```",
      ``,
    );

    if (!APPLY) continue;

    must(
      await supabase.from("protocols").update({ admin_data: sheet } as never).eq("id", p.id),
      `gravar ficha de ${p.title}`,
    );

    if (p.status === "published") {
      const latest = must(
        await supabase
          .from("protocol_versions")
          .select("version_number")
          .eq("protocol_id", p.id)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
        "última versão",
      ) as { version_number: number } | null;
      const next = (latest?.version_number ?? 0) + 1;
      must(
        await supabase
          .from("protocol_versions")
          .update({ is_current: false })
          .eq("protocol_id", p.id)
          .eq("is_current", true),
        "desmarcar versão corrente",
      );
      const version = must(
        await supabase
          .from("protocol_versions")
          .insert({
            protocol_id: p.id,
            tenant_id: p.tenant_id,
            version_number: next,
            graph: { nodes: nodeRows, edges: edgeRows, referral_data: null, admin_data: sheet } as never,
            change_note: "Convertido do fluxograma para o formato ficha.",
            published_by: null,
            is_current: true,
          })
          .select("id")
          .single(),
        `criar versão de ${p.title}`,
      ) as { id: string };
      must(
        await supabase.from("protocols").update({ active_version_id: version.id }).eq("id", p.id),
        "ativar versão",
      );
      must(
        await supabase.from("protocol_audit").insert({
          tenant_id: p.tenant_id,
          protocol_id: p.id,
          user_id: null,
          action: "publish",
          payload: { version_number: next, type: "pop", via: "conversao-ficha", layout: sheet.layout },
        }),
        "auditoria publicar",
      );
      summary.published++;
    }
  }

  report.splice(
    4,
    0,
    `Fichas de documentos: ${summary.requisitos} · fichas de etapas: ${summary.etapas} · itens separados: ${summary.splits}` +
      (APPLY ? ` · versões publicadas: ${summary.published} · já tinham ficha: ${summary.skipped} · arquivados: ${summary.archived}` : ""),
    ``,
    `## Itens que foram separados em linhas — revisar`,
    ``,
    ...splitLines,
    ``,
  );
  writeFileSync(reportPath, report.join("\n"), "utf8");
  console.log(JSON.stringify(summary));
  console.log(`Relatório: ${reportPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
