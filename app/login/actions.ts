"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Resolve o email (identidade interna do Supabase Auth) a partir do CPF.
 * Usa a service key (ignora RLS) e roda só no servidor — o CPF→email nunca é
 * exposto ao browser. Retorna null se não houver perfil com aquele CPF.
 */
async function emailForCpf(cpf: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("cpf", cpf)
    .maybeSingle();
  return data?.email ?? null;
}

// ----------------------------------------------------------------------------
// signIn — login com CPF + senha
// ----------------------------------------------------------------------------
const SignInSchema = z.object({
  cpf: z.string().refine((v) => isValidCpf(v), "Informe um CPF válido."),
  password: z.string().min(1, "Informe a senha."),
});

export interface SignInState {
  error?: string;
  fieldErrors?: { cpf?: string[]; password?: string[] };
}

export async function signInAction(
  _prev: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    cpf: formData.get("cpf"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const cpf = normalizeCpf(parsed.data.cpf);
  if (!cpf) return { error: "CPF ou senha inválidos." };

  // CPF → email (privilegiado, server-only)
  const email = await emailForCpf(cpf);
  // Mensagem genérica sempre — não revela se o CPF existe.
  if (!email) return { error: "CPF ou senha inválidos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "CPF ou senha inválidos." };
  }

  redirect("/admin/dashboard");
}

// ----------------------------------------------------------------------------
// requestPasswordReset — recebe CPF, envia magic link ao email cadastrado
// ----------------------------------------------------------------------------
const ResetSchema = z.object({
  cpf: z.string().refine((v) => isValidCpf(v), "Informe um CPF válido."),
});

export interface ResetState {
  error?: string;
  success?: boolean;
  fieldErrors?: { cpf?: string[] };
}

export async function requestPasswordResetAction(
  _prev: ResetState | undefined,
  formData: FormData,
): Promise<ResetState> {
  const parsed = ResetSchema.safeParse({ cpf: formData.get("cpf") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const cpf = normalizeCpf(parsed.data.cpf);
  // Sucesso é sempre idêntico (evita enumeração de CPF).
  if (!cpf) return { success: true };

  const email = await emailForCpf(cpf);
  if (email) {
    const supabase = await createClient();
    const origin = await getOrigin();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/admin/dashboard`,
    });
  }

  return { success: true };
}

// ----------------------------------------------------------------------------
// signOut
// ----------------------------------------------------------------------------
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
