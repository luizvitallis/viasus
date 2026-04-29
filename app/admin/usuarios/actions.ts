"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES_INVITABLE = ["curador", "publicador", "profissional"] as const;

const InviteSchema = z.object({
  name: z.string().min(2, "Informe o nome completo."),
  email: z.string().email("Informe um email válido."),
  role: z.enum(ROLES_INVITABLE),
});

export interface InviteState {
  error?: string;
  fieldErrors?: { name?: string[]; email?: string[]; role?: string[] };
  success?: {
    email: string;
    name: string;
    tempPassword: string;
  };
}

function generateTempPassword() {
  // 12 chars base64url-ish, robusto e copiável
  return randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

export async function inviteUserAction(
  _prev: InviteState | undefined,
  formData: FormData,
): Promise<InviteState> {
  const parsed = InviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Verificar quem está convidando: precisa ser gestor ou admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { data: inviter } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!inviter) {
    return { error: "Perfil do convidante não encontrado." };
  }
  if (inviter.role !== "gestor" && inviter.role !== "admin") {
    return { error: "Apenas gestores podem convidar editores." };
  }

  // Criar auth user via admin API
  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: parsed.data.name, invited_by: user.id },
  });

  if (createErr) {
    if (createErr.message.toLowerCase().includes("already")) {
      return { error: "Já existe um usuário com esse email." };
    }
    return { error: `Erro ao criar usuário: ${createErr.message}` };
  }
  if (!created.user) {
    return { error: "Resposta inesperada da API ao criar usuário." };
  }

  // Inserir profile linkado ao tenant do gestor
  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    tenant_id: inviter.tenant_id,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
  });

  if (profileErr) {
    // Rollback do auth user para não deixar órfão
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `Erro ao criar perfil: ${profileErr.message}` };
  }

  revalidatePath("/admin/usuarios");

  return {
    success: {
      email: parsed.data.email,
      name: parsed.data.name,
      tempPassword,
    },
  };
}
