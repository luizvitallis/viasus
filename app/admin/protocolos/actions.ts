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
