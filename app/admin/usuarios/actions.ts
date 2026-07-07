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
// updateUserCpf — gestor define/corrige o CPF de um usuário já existente
// ----------------------------------------------------------------------------
const UuidSchema = z
  .string()
  .regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);

export interface UpdateCpfResult {
  ok: boolean;
  error?: string;
}

export async function updateUserCpfAction(
  userId: string,
  cpfRaw: string,
): Promise<UpdateCpfResult> {
  if (!UuidSchema.safeParse(userId).success) {
    return { ok: false, error: "Usuário inválido." };
  }
  if (!isValidCpf(cpfRaw)) return { ok: false, error: "Informe um CPF válido." };
  const cpf = normalizeCpf(cpfRaw);
  if (!cpf) return { ok: false, error: "Informe um CPF válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: me } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  if (!me) return { ok: false, error: "Perfil não encontrado." };
  if (me.role !== "gestor" && me.role !== "admin") {
    return { ok: false, error: "Apenas gestores podem alterar o CPF." };
  }

  const admin = createAdminClient();

  // Alvo precisa ser do mesmo tenant.
  const { data: target } = await admin
    .from("profiles")
    .select("id, tenant_id")
    .eq("id", userId)
    .single();
  if (!target) return { ok: false, error: "Usuário não encontrado." };
  if (target.tenant_id !== me.tenant_id) {
    return { ok: false, error: "Cross-tenant negado." };
  }

  // CPF único global (ignorando o próprio usuário).
  const { data: clash } = await admin
    .from("profiles")
    .select("id")
    .eq("cpf", cpf)
    .neq("id", userId)
    .maybeSingle();
  if (clash) {
    return { ok: false, error: "Já existe um usuário com esse CPF." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ cpf })
    .eq("id", userId);
  if (error) return { ok: false, error: `Erro ao salvar: ${error.message}` };

  revalidatePath("/admin/usuarios");
  return { ok: true };
}
