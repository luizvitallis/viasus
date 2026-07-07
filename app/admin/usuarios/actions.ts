"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";

const ROLES_INVITABLE = ["curador", "publicador", "profissional"] as const;

const InviteSchema = z.object({
  name: z.string().min(2, "Informe o nome completo."),
  email: z.string().email("Informe um email válido."),
  cpf: z.string().refine((v) => isValidCpf(v), "Informe um CPF válido."),
  role: z.enum(ROLES_INVITABLE),
});

export interface InviteState {
  error?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    cpf?: string[];
    role?: string[];
  };
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
    cpf: formData.get("cpf"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const cpf = normalizeCpf(parsed.data.cpf);
  if (!cpf) return { fieldErrors: { cpf: ["Informe um CPF válido."] } };

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

  // CPF é único globalmente — checa antes pra dar erro amigável.
  const { data: cpfClash } = await admin
    .from("profiles")
    .select("id")
    .eq("cpf", cpf)
    .maybeSingle();
  if (cpfClash) {
    return { fieldErrors: { cpf: ["Já existe um usuário com esse CPF."] } };
  }

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
    cpf,
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

// ----------------------------------------------------------------------------
// Gestão de usuário existente: editar (nome/email/papel/CPF), inativar, excluir
// ----------------------------------------------------------------------------
const UuidSchema = z
  .string()
  .regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);

const ASSIGNABLE_ROLES = [
  "gestor",
  "curador",
  "publicador",
  "profissional",
] as const;

export interface UserActionResult {
  ok: boolean;
  error?: string;
}

/** Confere que quem chama é gestor/admin; retorna { me } ou um erro. */
async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." as const };

  const { data: me } = await supabase
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("id", user.id)
    .single();
  if (!me) return { error: "Perfil não encontrado." as const };
  if (me.role !== "gestor" && me.role !== "admin") {
    return { error: "Apenas gestores podem gerenciar usuários." as const };
  }
  return { me };
}

const UpdateUserSchema = z.object({
  userId: UuidSchema,
  name: z.string().min(2, "Informe o nome completo."),
  email: z.string().email("Informe um email válido."),
  role: z.enum(ASSIGNABLE_ROLES),
  cpf: z.string().refine((v) => isValidCpf(v), "Informe um CPF válido."),
});

export interface UpdateUserPayload {
  userId: string;
  name: string;
  email: string;
  role: string;
  cpf: string;
}

export async function updateUserAction(
  payload: UpdateUserPayload,
): Promise<UserActionResult> {
  const parsed = UpdateUserSchema.safeParse(payload);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const first =
      fe.name?.[0] ?? fe.email?.[0] ?? fe.role?.[0] ?? fe.cpf?.[0];
    return { ok: false, error: first ?? "Confira os campos." };
  }

  const gate = await requireManager();
  if ("error" in gate) return { ok: false, error: gate.error };
  const { me } = gate;

  const { userId, name, email, role } = parsed.data;
  const cpf = normalizeCpf(parsed.data.cpf);
  if (!cpf) return { ok: false, error: "Informe um CPF válido." };

  // Não deixar o gestor remover o próprio papel de gestão (evita se travar).
  if (userId === me.id && role !== "gestor" && me.role === "gestor") {
    return { ok: false, error: "Você não pode remover seu próprio papel de gestão." };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, tenant_id, email")
    .eq("id", userId)
    .single();
  if (!target) return { ok: false, error: "Usuário não encontrado." };
  if (target.tenant_id !== me.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  const { data: clash } = await admin
    .from("profiles")
    .select("id")
    .eq("cpf", cpf)
    .neq("id", userId)
    .maybeSingle();
  if (clash) return { ok: false, error: "Já existe um usuário com esse CPF." };

  // Trocar email atualiza a identidade no Supabase Auth também.
  if (email !== target.email) {
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });
    if (authErr) {
      const msg = authErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        return { ok: false, error: "Já existe um usuário com esse email." };
      }
      return { ok: false, error: `Erro ao atualizar email: ${authErr.message}` };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ name, email, role, cpf })
    .eq("id", userId);
  if (error) return { ok: false, error: `Erro ao salvar: ${error.message}` };

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function setUserActiveAction(
  userId: string,
  active: boolean,
): Promise<UserActionResult> {
  if (!UuidSchema.safeParse(userId).success) {
    return { ok: false, error: "Usuário inválido." };
  }
  const gate = await requireManager();
  if ("error" in gate) return { ok: false, error: gate.error };
  const { me } = gate;

  if (userId === me.id && !active) {
    return { ok: false, error: "Você não pode inativar a si mesmo." };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, tenant_id")
    .eq("id", userId)
    .single();
  if (!target) return { ok: false, error: "Usuário não encontrado." };
  if (target.tenant_id !== me.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ active })
    .eq("id", userId);
  if (error) return { ok: false, error: `Erro: ${error.message}` };

  // Espelha no Auth: banir invalida a sessão no refresh; "none" reativa.
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h",
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function deleteUserAction(
  userId: string,
): Promise<UserActionResult> {
  if (!UuidSchema.safeParse(userId).success) {
    return { ok: false, error: "Usuário inválido." };
  }
  const gate = await requireManager();
  if ("error" in gate) return { ok: false, error: gate.error };
  const { me } = gate;

  if (userId === me.id) {
    return { ok: false, error: "Você não pode excluir a si mesmo." };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, tenant_id")
    .eq("id", userId)
    .single();
  if (!target) return { ok: false, error: "Usuário não encontrado." };
  if (target.tenant_id !== me.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  // Apaga o auth user; o profile cai por cascade (profiles.id → auth.users).
  // Protocolos criados/curados por ele permanecem (autor vira null, ON DELETE
  // SET NULL nas FKs owner_curator_id/created_by).
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: `Erro ao excluir: ${error.message}` };

  revalidatePath("/admin/usuarios");
  return { ok: true };
}
