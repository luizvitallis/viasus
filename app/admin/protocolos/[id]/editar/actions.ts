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
// updateProtocolMeta — alterar título/specialty/summary/tags (header do protocolo)
// ----------------------------------------------------------------------------
const MetaSchema = z.object({
  protocolId: z.string().uuid(),
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
