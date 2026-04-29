"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// ----------------------------------------------------------------------------
// signIn — login com email + senha
// ----------------------------------------------------------------------------
const SignInSchema = z.object({
  email: z.string().email("Informe um email válido."),
  password: z.string().min(1, "Informe a senha."),
});

export interface SignInState {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
}

export async function signInAction(
  _prev: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Mensagem genérica — não vazar se email existe
    return { error: "Email ou senha inválidos." };
  }

  redirect("/admin/dashboard");
}

// ----------------------------------------------------------------------------
// requestPasswordReset — envia magic link de redefinição
// ----------------------------------------------------------------------------
const ResetSchema = z.object({
  email: z.string().email("Informe um email válido."),
});

export interface ResetState {
  error?: string;
  success?: boolean;
  fieldErrors?: { email?: string[] };
}

export async function requestPasswordResetAction(
  _prev: ResetState | undefined,
  formData: FormData,
): Promise<ResetState> {
  const parsed = ResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/admin/dashboard`,
  });

  if (error) {
    return { error: "Não foi possível enviar o email. Tente novamente em instantes." };
  }

  // Sucesso retorna idêntico independente do email existir (evita enumeração)
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
