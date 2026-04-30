"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PROTOCOL_TYPES = [
  "linha_cuidado",
  "pcdt",
  "encaminhamento",
  "pop",
  "diretriz",
] as const;

const NewProtocolSchema = z.object({
  title: z.string().min(3, "Título precisa de pelo menos 3 caracteres."),
  type: z.enum(PROTOCOL_TYPES),
  specialty: z.string().optional(),
  summary: z.string().optional(),
});

export interface NewProtocolState {
  error?: string;
  fieldErrors?: {
    title?: string[];
    type?: string[];
    specialty?: string[];
    summary?: string[];
  };
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createProtocolAction(
  _prev: NewProtocolState | undefined,
  formData: FormData,
): Promise<NewProtocolState> {
  const parsed = NewProtocolSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    specialty: formData.get("specialty") || undefined,
    summary: formData.get("summary") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Perfil não encontrado." };

  if (!["curador", "publicador", "gestor", "admin"].includes(profile.role)) {
    return { error: "Seu papel não permite criar protocolos." };
  }

  const baseSlug = slugify(parsed.data.title);
  if (!baseSlug) return { error: "Título inválido." };

  // Garantir slug único no tenant — append -2, -3 se necessário
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const { data: collision } = await supabase
      .from("protocols")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("slug", slug)
      .maybeSingle();
    if (!collision) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const { data: created, error: insertErr } = await supabase
    .from("protocols")
    .insert({
      tenant_id: profile.tenant_id,
      type: parsed.data.type,
      title: parsed.data.title,
      slug,
      specialty: parsed.data.specialty ?? null,
      summary: parsed.data.summary ?? null,
      status: "draft",
      owner_curator_id: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !created) {
    return { error: insertErr?.message ?? "Erro ao criar protocolo." };
  }

  redirect(`/admin/protocolos/${created.id}/editar`);
}
