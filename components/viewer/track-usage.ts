"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type UsageAction = Database["public"]["Enums"]["usage_action"];

interface TrackParams {
  tenantId: string;
  protocolId: string;
  versionId: string | null;
  nodeId?: string | null;
  action: UsageAction;
  durationMs?: number | null;
}

/**
 * Registra evento de uso anônimo na tabela `protocol_usage`.
 * RLS permite anon INSERT desde que user_id seja null e o protocolo
 * seja published (migration 0004).
 *
 * Falhas não interrompem a UI — analytics não pode quebrar a experiência.
 */
export async function trackUsage({
  tenantId,
  protocolId,
  versionId,
  nodeId,
  action,
  durationMs,
}: TrackParams) {
  try {
    const supabase = createClient();
    await supabase.from("protocol_usage").insert({
      tenant_id: tenantId,
      protocol_id: protocolId,
      version_id: versionId,
      user_id: null,
      node_id: nodeId ?? null,
      action,
      duration_ms: durationMs ?? null,
    });
  } catch (err) {
    // Silencioso — analytics nunca quebra UX
    if (process.env.NODE_ENV === "development") {
      console.warn("[trackUsage] falhou:", err);
    }
  }
}
