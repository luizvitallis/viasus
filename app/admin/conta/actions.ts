"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ChangePasswordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    password: z
      .string()
      .min(8, "A nova senha precisa de pelo menos 8 caracteres."),
    confirm: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não conferem.",
    path: ["confirm"],
  });

export interface ChangePasswordState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    current?: string[];
    password?: string[];
    confirm?: string[];
  };
}

export async function changePasswordAction(
  _prev: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = ChangePasswordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  // Verifica a senha atual reautenticando (o Supabase não valida a senha atual
  // no updateUser). Também cobre o primeiro acesso: a "senha atual" é a temporária.
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (signInErr) {
    return { fieldErrors: { current: ["Senha atual incorreta."] } };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("different")) {
      return { error: "A nova senha precisa ser diferente da atual." };
    }
    return { error: "Não foi possível trocar a senha. Tente uma senha mais forte." };
  }

  return { success: true };
}
