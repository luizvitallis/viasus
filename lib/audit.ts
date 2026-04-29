/**
 * Audit log helper — registra eventos de escrita em `protocol_audit`.
 *
 * Uso:
 *   await logAudit({ action: 'publish', protocolId, payload: { version: 3 } });
 *
 * Para eventos de auth (login, invite, role_changed) o enum `audit_action`
 * precisa ser estendido — fica deferido para a Fase 5 junto com a migration
 * de versionamento/publicação.
 */

import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuditAction = Database["public"]["Enums"]["audit_action"];

interface LogAuditParams {
  supabase: SupabaseClient<Database>;
  action: AuditAction;
  protocolId?: string | null;
  payload?: Record<string, unknown>;
}

export async function logAudit({
  supabase,
  action,
  protocolId,
  payload,
}: LogAuditParams) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile) return;

  await supabase.from("protocol_audit").insert({
    tenant_id: profile.tenant_id,
    protocol_id: protocolId ?? null,
    user_id: user.id,
    action,
    payload: (payload ?? null) as Database["public"]["Tables"]["protocol_audit"]["Insert"]["payload"],
  });
}
