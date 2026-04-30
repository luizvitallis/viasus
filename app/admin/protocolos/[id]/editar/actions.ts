"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { NodeType, EdgeStyle } from "@/types/domain";

const NODE_TYPES = [
  "ponto_atencao",
  "decisao",
  "conduta_intermediaria",
  "conduta_terminal",
  "encaminhamento",
  "calculadora",
  "documento",
] as const;

const EDGE_STYLES = ["normal", "urgente", "condicional"] as const;

// Zod 4 valida UUID estritamente (exige version digit 1-5). Os UUIDs do seed
// foram criados com prefixos legíveis (33333333-...) para facilitar debug e
// não passam nessa regra. Como o Postgres já valida o formato no INSERT,
// relaxamos para checagem estrutural (8-4-4-4-12 hex).
const uuidish = z
  .string()
  .regex(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    "uuid inválido",
  );

const NodeSchema = z.object({
  id: uuidish,
  type: z.enum(NODE_TYPES),
  label: z.string().default(""),
  position_x: z.number(),
  position_y: z.number(),
  content: z.unknown().nullable().optional(),
  tags: z.array(z.string()).default([]),
  calculator_type: z.string().nullable().optional(),
  documento_categoria: z.string().nullable().optional(),
  documento_acao: z.string().nullable().optional(),
  documento_link: z.string().nullable().optional(),
});

const EdgeSchema = z.object({
  id: uuidish,
  source_node_id: uuidish,
  target_node_id: uuidish,
  label: z.string().nullable().optional(),
  style: z.enum(EDGE_STYLES),
  condition_expr: z.unknown().nullable().optional(),
});

const PayloadSchema = z.object({
  protocolId: uuidish,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export interface SaveResult {
  ok: boolean;
  error?: string;
  savedAt?: string;
}

export async function saveProtocolGraph(payload: unknown): Promise<SaveResult> {
  const parsed = PayloadSchema.safeParse(payload);
  if (!parsed.success) {
    // Loga no servidor a estrutura completa do erro pra debug
    console.error(
      "[saveProtocolGraph] payload inválido:",
      JSON.stringify(parsed.error.issues, null, 2),
    );
    const first = parsed.error.issues[0];
    const path = first?.path?.join(".") ?? "?";
    return {
      ok: false,
      error: `Payload inválido em ${path}: ${first?.message ?? "—"}`,
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

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, tenant_id, status")
    .eq("id", parsed.data.protocolId)
    .single();
  if (!protocol) return { ok: false, error: "Protocolo não encontrado." };

  if (protocol.tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  // Quem pode editar
  if (!["curador", "publicador", "gestor", "admin"].includes(profile.role)) {
    return { ok: false, error: "Sem permissão para editar." };
  }

  const tenantId = protocol.tenant_id;
  const protocolId = protocol.id;

  // ID atuais em DB → diff contra payload
  const [{ data: dbNodes }, { data: dbEdges }] = await Promise.all([
    supabase.from("nodes").select("id").eq("protocol_id", protocolId),
    supabase.from("edges").select("id").eq("protocol_id", protocolId),
  ]);

  const currentNodeIds = new Set(dbNodes?.map((n) => n.id) ?? []);
  const newNodeIds = new Set(parsed.data.nodes.map((n) => n.id));
  const nodesToDelete = [...currentNodeIds].filter((id) => !newNodeIds.has(id));

  const currentEdgeIds = new Set(dbEdges?.map((e) => e.id) ?? []);
  const newEdgeIds = new Set(parsed.data.edges.map((e) => e.id));
  const edgesToDelete = [...currentEdgeIds].filter((id) => !newEdgeIds.has(id));

  // FK: deletar edges antes de nodes
  if (edgesToDelete.length) {
    const { error } = await supabase.from("edges").delete().in("id", edgesToDelete);
    if (error) return { ok: false, error: `Erro deletando arestas: ${error.message}` };
  }
  if (nodesToDelete.length) {
    const { error } = await supabase.from("nodes").delete().in("id", nodesToDelete);
    if (error) return { ok: false, error: `Erro deletando nós: ${error.message}` };
  }

  // Upsert nodes (precisam existir antes das edges via FK)
  if (parsed.data.nodes.length) {
    const nodeRows = parsed.data.nodes.map((n) => ({
      id: n.id,
      protocol_id: protocolId,
      tenant_id: tenantId,
      type: n.type as NodeType,
      label: n.label,
      position_x: n.position_x,
      position_y: n.position_y,
      content: (n.content ?? {}) as never,
      tags: (n.tags ?? []) as never,
      calculator_type: n.calculator_type ?? null,
      documento_categoria: n.documento_categoria ?? null,
      documento_acao: n.documento_acao ?? null,
      documento_link: n.documento_link ?? null,
    }));
    const { error } = await supabase.from("nodes").upsert(nodeRows);
    if (error) return { ok: false, error: `Erro salvando nós: ${error.message}` };
  }

  if (parsed.data.edges.length) {
    const edgeRows = parsed.data.edges.map((e) => ({
      id: e.id,
      protocol_id: protocolId,
      tenant_id: tenantId,
      source_node_id: e.source_node_id,
      target_node_id: e.target_node_id,
      label: e.label ?? null,
      style: e.style as EdgeStyle,
      condition_expr: (e.condition_expr ?? null) as never,
    }));
    const { error } = await supabase.from("edges").upsert(edgeRows);
    if (error) return { ok: false, error: `Erro salvando arestas: ${error.message}` };
  }

  // Bump updated_at em protocols (trigger set_updated_at + nenhum campo alterado
  // não dispara — atualizamos um campo neutro pra disparar)
  await supabase
    .from("protocols")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", protocolId);

  return { ok: true, savedAt: new Date().toISOString() };
}

// ----------------------------------------------------------------------------
// saveReferralData — salva a árvore JSONB de protocolos de encaminhamento
// ----------------------------------------------------------------------------
const ReferralCategorySchema = z.enum([
  "condicao",
  "sinal",
  "sintoma",
  "exame",
  "achado",
]);

type ReferralNodeShape = {
  id: string;
  label: string;
  text_when_checked?: string;
  category?: z.infer<typeof ReferralCategorySchema> | null;
  children?: ReferralNodeShape[];
};

const ReferralNodeSchema: z.ZodType<ReferralNodeShape> = z.lazy(() =>
  z.object({
    id: uuidish,
    label: z.string().default(""),
    text_when_checked: z.string().optional(),
    category: ReferralCategorySchema.nullable().optional(),
    children: z.array(ReferralNodeSchema).optional(),
  }),
);

const ReferralDataSchema = z.object({
  introduction: z.string().optional(),
  closing: z.string().optional(),
  tree: z.array(ReferralNodeSchema),
});

const SaveReferralSchema = z.object({
  protocolId: uuidish,
  data: ReferralDataSchema,
});

export async function saveReferralData(payload: unknown): Promise<SaveResult> {
  const parsed = SaveReferralSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(
      "[saveReferralData] payload inválido:",
      JSON.stringify(parsed.error.issues, null, 2),
    );
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Payload inválido em ${first?.path?.join(".") ?? "?"}: ${first?.message ?? "—"}`,
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
    return { ok: false, error: "Sem permissão para editar." };
  }

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, tenant_id, type")
    .eq("id", parsed.data.protocolId)
    .single();
  if (!protocol) return { ok: false, error: "Protocolo não encontrado." };
  if (protocol.tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }
  if (protocol.type !== "encaminhamento") {
    return {
      ok: false,
      error: "Esse tipo de protocolo não suporta dados de encaminhamento.",
    };
  }

  const { error } = await supabase
    .from("protocols")
    .update({
      referral_data: parsed.data.data as never,
      updated_at: new Date().toISOString(),
    })
    .eq("id", protocol.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, savedAt: new Date().toISOString() };
}

// ----------------------------------------------------------------------------
// publishProtocol — congela live nodes/edges em protocol_versions e marca published
// ----------------------------------------------------------------------------
const PublishSchema = z.object({
  protocolId: uuidish,
  changeNote: z.string().max(500).optional(),
});

export interface PublishResult {
  ok: boolean;
  error?: string;
  versionNumber?: number;
}

export async function publishProtocol(payload: unknown): Promise<PublishResult> {
  const parsed = PublishSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "Dados de publicação inválidos." };
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

  // Apenas gestor/publicador/admin podem publicar
  if (!["gestor", "publicador", "admin"].includes(profile.role)) {
    return { ok: false, error: "Seu papel não permite publicar." };
  }

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, tenant_id, type, referral_data")
    .eq("id", parsed.data.protocolId)
    .single();
  if (!protocol) return { ok: false, error: "Protocolo não encontrado." };
  if (protocol.tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  // Snapshot dos nós e arestas vivos (vazio se for encaminhamento)
  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase
      .from("nodes")
      .select("id, type, label, position_x, position_y, content, tags, calculator_type, links_to_protocol_id, encaminhamento_target_id, documento_categoria, documento_acao, documento_link")
      .eq("protocol_id", protocol.id),
    supabase
      .from("edges")
      .select("id, source_node_id, target_node_id, label, style, condition_expr")
      .eq("protocol_id", protocol.id),
  ]);

  // Validação de "tem conteúdo pra publicar":
  //   - Tipos de fluxograma (linha_cuidado, pcdt, pop, diretriz): exige nós
  //   - Encaminhamento: exige árvore não-vazia em referral_data
  if (protocol.type === "encaminhamento") {
    const refTree = (protocol.referral_data as { tree?: unknown[] } | null)
      ?.tree;
    if (!refTree || refTree.length === 0) {
      return {
        ok: false,
        error:
          "Adicione ao menos uma condição/achado antes de publicar.",
      };
    }
  } else if (!nodes || nodes.length === 0) {
    return { ok: false, error: "Não é possível publicar um protocolo sem nós." };
  }

  // Calcula version_number (max + 1)
  const { data: latest } = await supabase
    .from("protocol_versions")
    .select("version_number")
    .eq("protocol_id", protocol.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version_number ?? 0) + 1;

  // Marca versões anteriores como não-correntes
  await supabase
    .from("protocol_versions")
    .update({ is_current: false })
    .eq("protocol_id", protocol.id)
    .eq("is_current", true);

  // Cria nova versão com snapshot — inclui o referral_data se houver,
  // pra que o visualizador (Phase 4/9) renderize a partir do snapshot
  // imutável e não da live data.
  const graph = {
    nodes: nodes ?? [],
    edges: edges ?? [],
    referral_data: protocol.referral_data ?? null,
  };

  const { data: newVersion, error: versionErr } = await supabase
    .from("protocol_versions")
    .insert({
      protocol_id: protocol.id,
      tenant_id: protocol.tenant_id,
      version_number: nextVersion,
      graph: graph as never,
      change_note: parsed.data.changeNote ?? null,
      published_by: user.id,
      is_current: true,
    })
    .select("id, version_number")
    .single();

  if (versionErr || !newVersion) {
    return {
      ok: false,
      error: versionErr?.message ?? "Erro ao criar versão.",
    };
  }

  // Atualiza protocolo: status=published, active_version_id=nova
  const { error: protoErr } = await supabase
    .from("protocols")
    .update({
      status: "published",
      active_version_id: newVersion.id,
    })
    .eq("id", protocol.id);

  if (protoErr) {
    return { ok: false, error: `Erro atualizando protocolo: ${protoErr.message}` };
  }

  // Audit log
  await supabase.from("protocol_audit").insert({
    tenant_id: protocol.tenant_id,
    protocol_id: protocol.id,
    user_id: user.id,
    action: "publish",
    payload: {
      version_number: newVersion.version_number,
      change_note: parsed.data.changeNote ?? null,
      nodes_count: (nodes ?? []).length,
      edges_count: (edges ?? []).length,
      type: protocol.type,
    } as never,
  });

  return { ok: true, versionNumber: newVersion.version_number };
}

// ----------------------------------------------------------------------------
// updateProtocolMeta — alterar título/specialty/summary/tags (header do protocolo)
// ----------------------------------------------------------------------------
const MetaSchema = z.object({
  protocolId: uuidish,
  title: z.string().min(3).optional(),
  specialty: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export async function updateProtocolMeta(payload: unknown): Promise<SaveResult> {
  const parsed = MetaSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { protocolId, ...rest } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (rest.title !== undefined) updates.title = rest.title;
  if (rest.specialty !== undefined) updates.specialty = rest.specialty;
  if (rest.summary !== undefined) updates.summary = rest.summary;

  if (Object.keys(updates).length === 0) {
    return { ok: true, savedAt: new Date().toISOString() };
  }

  const { error } = await supabase
    .from("protocols")
    .update(updates)
    .eq("id", protocolId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, savedAt: new Date().toISOString() };
}
