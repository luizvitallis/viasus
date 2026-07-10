"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction, type ChangePasswordState } from "./actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<
    ChangePasswordState | undefined,
    FormData
  >(changePasswordAction, undefined);

  if (state?.success) {
    return (
      <div
        role="status"
        className="border-l-2 border-emerald-800 bg-emerald-50 px-4 py-4 text-sm text-emerald-950"
      >
        Senha alterada com sucesso. Use a nova senha no próximo acesso.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="current">Senha atual</Label>
        <Input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state?.fieldErrors?.current)}
        />
        {state?.fieldErrors?.current && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.current[0]}
          </p>
        )}
        <p className="text-xs text-stone-500">
          No primeiro acesso, use a senha temporária que o gestor te passou.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Pelo menos 6 caracteres"
          aria-invalid={Boolean(state?.fieldErrors?.password)}
        />
        {state?.fieldErrors?.password && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar nova senha</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state?.fieldErrors?.confirm)}
        />
        {state?.fieldErrors?.confirm && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.confirm[0]}
          </p>
        )}
      </div>

      {state?.error && (
        <div
          role="alert"
          className="border-l-2 border-destructive bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="bg-emerald-800 hover:bg-emerald-900 text-stone-50 h-11 px-6 rounded-none"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Salvando…
          </>
        ) : (
          "Trocar senha"
        )}
      </Button>
    </form>
  );
}
