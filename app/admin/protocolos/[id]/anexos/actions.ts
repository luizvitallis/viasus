"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ProtocolIdSchema = z.string().regex(
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
);

export interface UploadResult {
  ok: boolean;
  error?: string;
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export async function uploadAttachmentAction(
  protocolId: string,
  _prev: UploadResult | undefined,
  formData: FormData,
): Promise<UploadResult> {
  const idCheck = ProtocolIdSchema.safeParse(protocolId);
  if (!idCheck.success) return { ok: false, error: "ID inválido." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: `Arquivo maior que 25 MB.` };
  }

  if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
    return {
      ok: false,
      error: `Tipo não permitido (${file.type}). Aceitos: PDF, PNG, JPEG, WebP.`,
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
    return { ok: false, error: "Sem permissão." };
  }

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, tenant_id")
    .eq("id", protocolId)
    .single();
  if (!protocol) return { ok: false, error: "Protocolo não encontrado." };
  if (protocol.tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  const ext = extFromMime(file.type);
  const path = `${profile.tenant_id}/${protocol.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("protocol-attachments")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadErr) {
    return { ok: false, error: `Erro no upload: ${uploadErr.message}` };
  }

  const { error: insertErr } = await supabase.from("attachments").insert({
    tenant_id: profile.tenant_id,
    protocol_id: protocol.id,
    filename: file.name,
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
  });

  if (insertErr) {
    // Tenta limpar o objeto órfão no Storage
    await supabase.storage.from("protocol-attachments").remove([path]);
    return { ok: false, error: `Erro registrando anexo: ${insertErr.message}` };
  }

  revalidatePath(`/admin/protocolos/${protocolId}/anexos`);
  return { ok: true };
}

const DeleteSchema = z.object({
  attachmentId: ProtocolIdSchema,
});

export async function deleteAttachmentAction(
  attachmentId: string,
): Promise<UploadResult> {
  const parsed = DeleteSchema.safeParse({ attachmentId });
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
    return { ok: false, error: "Sem permissão." };
  }

  const { data: attachment } = await supabase
    .from("attachments")
    .select("id, storage_path, tenant_id, protocol_id")
    .eq("id", attachmentId)
    .single();
  if (!attachment) return { ok: false, error: "Anexo não encontrado." };
  if (attachment.tenant_id !== profile.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  // Remove do Storage primeiro; mesmo se falhar (objeto já órfão), prossegue
  await supabase.storage
    .from("protocol-attachments")
    .remove([attachment.storage_path]);

  const { error: delErr } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId);
  if (delErr) return { ok: false, error: `Erro: ${delErr.message}` };

  revalidatePath(`/admin/protocolos/${attachment.protocol_id}/anexos`);
  return { ok: true };
}
