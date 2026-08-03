"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const ProtocolIdSchema = z
  .string()
  .regex(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    "ID inválido.",
  );

export interface DeleteProtocolResult {
  ok: boolean;
  /** O que de fato aconteceu — o servidor é a fonte da verdade da regra híbrida. */
  mode?: "deleted" | "archived";
  error?: string;
}

/**
 * Exclusão híbrida de protocolo (decisão do gestor):
 *   - nunca publicado (sem versão em protocol_versions) → exclusão permanente
 *   - já teve versão publicada                          → apenas arquivado
 * Permissão: gestor/admin (espelha a policy RLS `protocols_delete_admin`).
 */
export async function deleteProtocolAction(
  protocolId: string,
): Promise<DeleteProtocolResult> {
  const parsed = ProtocolIdSchema.safeParse(protocolId);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Perfil não encontrado." };
  if (!["gestor", "admin"].includes(profile.role)) {
    return {
      ok: false,
      error: "Apenas gestor ou admin podem excluir protocolos.",
    };
  }

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, tenant_id, title, slug, status, type")
    .eq("id", protocolId)
    .single();
  if (!protocol) return { ok: false, error: "Protocolo não encontrado." };
  if (protocol.tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  // Regra híbrida: já existe alguma versão publicada?
  const { count } = await supabase
    .from("protocol_versions")
    .select("id", { count: "exact", head: true })
    .eq("protocol_id", protocolId);
  const hasHistory = (count ?? 0) > 0;

  // -------- Caminho ARQUIVAR (preserva histórico) --------
  if (hasHistory) {
    if (protocol.status === "archived") {
      return { ok: false, error: "Este protocolo já está arquivado." };
    }
    const { error } = await supabase
      .from("protocols")
      .update({ status: "archived" })
      .eq("id", protocolId);
    if (error) return { ok: false, error: `Erro ao arquivar: ${error.message}` };

    await logAudit({
      supabase,
      action: "archive",
      protocolId,
      payload: { title: protocol.title, slug: protocol.slug, via: "delete" },
    });
    revalidatePath("/admin/protocolos");
    return { ok: true, mode: "archived" };
  }

  // -------- Caminho EXCLUIR de vez --------
  // Limpa os objetos no Storage antes do cascade (que só apaga as LINHAS de
  // attachments, deixando os arquivos órfãos no bucket).
  const { data: attachments } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("protocol_id", protocolId);
  const paths = (attachments ?? [])
    .map((a) => a.storage_path)
    .filter((p): p is string => Boolean(p));
  if (paths.length) {
    await supabase.storage.from("protocol-attachments").remove(paths);
  }

  // Audit ANTES do delete: o cascade zera protocol_id (ON DELETE SET NULL),
  // então o payload preserva a identidade do que foi apagado.
  await logAudit({
    supabase,
    action: "delete_protocol",
    protocolId,
    payload: {
      title: protocol.title,
      slug: protocol.slug,
      type: protocol.type,
    },
  });

  const { error } = await supabase
    .from("protocols")
    .delete()
    .eq("id", protocolId);
  if (error) return { ok: false, error: `Erro ao excluir: ${error.message}` };

  revalidatePath("/admin/protocolos");
  return { ok: true, mode: "deleted" };
}

// ----------------------------------------------------------------------------
// duplicateProtocolAction — copia um protocolo inteiro (grafo + conteúdo) como
// novo rascunho, pra criar outro parecido só editando (ex.: trocar o título).
// Não copia anexos (arquivos no Storage) — só o fluxograma/conteúdo.
// ----------------------------------------------------------------------------
function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface DuplicateProtocolResult {
  ok: boolean;
  error?: string;
  newId?: string;
}

export async function duplicateProtocolAction(
  protocolId: string,
): Promise<DuplicateProtocolResult> {
  const parsed = ProtocolIdSchema.safeParse(protocolId);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Perfil não encontrado." };
  if (!["curador", "publicador", "gestor", "admin"].includes(profile.role)) {
    return { ok: false, error: "Seu papel não permite duplicar protocolos." };
  }

  const { data: src } = await supabase
    .from("protocols")
    .select("id, tenant_id, type, title, specialty, summary, tags, referral_data")
    .eq("id", protocolId)
    .single();
  if (!src) return { ok: false, error: "Protocolo não encontrado." };
  if (src.tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  // Slug único no tenant, sufixo -copia (-copia-2, -3…).
  const baseSlug = slugify(src.title) || "protocolo";
  let slug = `${baseSlug}-copia`;
  let suffix = 2;
  while (true) {
    const { data: clash } = await supabase
      .from("protocols")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = `${baseSlug}-copia-${suffix}`;
    suffix += 1;
  }

  const { data: created, error: insErr } = await supabase
    .from("protocols")
    .insert({
      tenant_id: profile.tenant_id,
      type: src.type,
      title: `${src.title} (cópia)`,
      slug,
      specialty: src.specialty,
      summary: src.summary,
      tags: src.tags as never,
      referral_data: (src as { referral_data?: unknown }).referral_data as never,
      status: "draft",
      owner_curator_id: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insErr || !created) {
    return { ok: false, error: insErr?.message ?? "Erro ao duplicar." };
  }

  // Copiar nós — novos IDs, mantendo o mapa antigo→novo pras arestas.
  const { data: nodes } = await supabase
    .from("nodes")
    .select(
      "id, type, label, position_x, position_y, content, tags, calculator_type, links_to_protocol_id, encaminhamento_target_id, documento_categoria, documento_acao, documento_link, color_bg, color_border, links",
    )
    .eq("protocol_id", protocolId);

  const idMap = new Map<string, string>();
  if (nodes && nodes.length) {
    const nodeRows = nodes.map((n) => {
      const newId = crypto.randomUUID();
      idMap.set(n.id, newId);
      const x = n as Record<string, unknown>;
      return {
        id: newId,
        protocol_id: created.id,
        tenant_id: profile.tenant_id,
        type: n.type,
        label: n.label,
        position_x: n.position_x,
        position_y: n.position_y,
        content: (n.content ?? {}) as never,
        tags: (n.tags ?? []) as never,
        calculator_type: n.calculator_type ?? null,
        links_to_protocol_id: n.links_to_protocol_id ?? null,
        encaminhamento_target_id: n.encaminhamento_target_id ?? null,
        documento_categoria: (x.documento_categoria as string | null) ?? null,
        documento_acao: (x.documento_acao as string | null) ?? null,
        documento_link: (x.documento_link as string | null) ?? null,
        color_bg: (x.color_bg as string | null) ?? null,
        color_border: (x.color_border as string | null) ?? null,
        links: ((x.links as unknown) ?? []) as never,
      };
    });
    const { error: nodesErr } = await supabase.from("nodes").insert(nodeRows);
    if (nodesErr) {
      await supabase.from("protocols").delete().eq("id", created.id);
      return { ok: false, error: `Erro copiando nós: ${nodesErr.message}` };
    }
  }

  // Copiar arestas — remapeando source/target pros novos IDs de nó.
  const { data: edges } = await supabase
    .from("edges")
    .select("source_node_id, target_node_id, label, style, condition_expr, color_stroke")
    .eq("protocol_id", protocolId);

  if (edges && edges.length) {
    const edgeRows = edges.flatMap((e) => {
      const s = idMap.get(e.source_node_id);
      const t = idMap.get(e.target_node_id);
      if (!s || !t) return [];
      const x = e as Record<string, unknown>;
      return [
        {
          protocol_id: created.id,
          tenant_id: profile.tenant_id,
          source_node_id: s,
          target_node_id: t,
          label: e.label ?? null,
          style: e.style,
          condition_expr: ((x.condition_expr as unknown) ?? null) as never,
          color_stroke: (x.color_stroke as string | null) ?? null,
        },
      ];
    });
    if (edgeRows.length) {
      const { error: edgesErr } = await supabase.from("edges").insert(edgeRows);
      if (edgesErr) {
        await supabase.from("protocols").delete().eq("id", created.id);
        return { ok: false, error: `Erro copiando conexões: ${edgesErr.message}` };
      }
    }
  }

  await logAudit({
    supabase,
    action: "fork",
    protocolId: created.id,
    payload: { source_protocol_id: protocolId, title: `${src.title} (cópia)` },
  });

  revalidatePath("/admin/protocolos");
  return { ok: true, newId: created.id };
}

// ----------------------------------------------------------------------------
// updateProtocolInfoAction — editar cabeçalho (título/tipo/especialidade/resumo)
// de um protocolo já criado. O slug NÃO muda (mantém a URL pública estável).
// ----------------------------------------------------------------------------
const PROTOCOL_TYPES_INFO = [
  "linha_cuidado",
  "pcdt",
  "encaminhamento",
  "pop",
  "diretriz",
] as const;

const UpdateInfoSchema = z.object({
  protocolId: ProtocolIdSchema,
  title: z.string().min(3, "Título precisa de pelo menos 3 caracteres."),
  type: z.enum(PROTOCOL_TYPES_INFO, { error: "Tipo inválido." }),
  specialty: z.string().trim().nullable().optional(),
  summary: z.string().trim().nullable().optional(),
});

export interface UpdateInfoPayload {
  protocolId: string;
  title: string;
  type: string;
  specialty: string | null;
  summary: string | null;
}

export async function updateProtocolInfoAction(
  payload: UpdateInfoPayload,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = UpdateInfoSchema.safeParse(payload);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: fe.title?.[0] ?? fe.type?.[0] ?? "Confira os campos.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Perfil não encontrado." };
  if (!["curador", "publicador", "gestor", "admin"].includes(profile.role)) {
    return { ok: false, error: "Seu papel não permite editar protocolos." };
  }

  const { data: p } = await supabase
    .from("protocols")
    .select("id, tenant_id")
    .eq("id", parsed.data.protocolId)
    .single();
  if (!p) return { ok: false, error: "Protocolo não encontrado." };
  if (p.tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  const specialty = parsed.data.specialty?.length ? parsed.data.specialty : null;
  const summary = parsed.data.summary?.length ? parsed.data.summary : null;

  const { error } = await supabase
    .from("protocols")
    .update({
      title: parsed.data.title,
      type: parsed.data.type,
      specialty,
      summary,
    })
    .eq("id", parsed.data.protocolId);
  if (error) return { ok: false, error: `Erro ao salvar: ${error.message}` };

  await logAudit({
    supabase,
    action: "update",
    protocolId: parsed.data.protocolId,
    payload: { title: parsed.data.title, type: parsed.data.type },
  });

  revalidatePath("/admin/protocolos");
  return { ok: true };
}
