"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction, type ResetState } from "../actions";

export function ResetForm() {
  const [state, action, pending] = useActionState<ResetState | undefined, FormData>(
    requestPasswordResetAction,
    undefined,
  );

  if (state?.success) {
    return (
      <div
        role="status"
        className="border-l-2 border-emerald-800 bg-emerald-50 px-4 py-4 text-sm text-emerald-950"
      >
        Pronto. Se o email estiver cadastrado, você vai receber um link em alguns
        minutos. Cheque também a caixa de spam.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email institucional</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="seu.nome@viasus.test"
          aria-invalid={Boolean(state?.fieldErrors?.email)}
        />
        {state?.fieldErrors?.email && (
          <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
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
        className="w-full bg-emerald-800 hover:bg-emerald-900 text-stone-50 h-11 rounded-none"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Enviando…
          </>
        ) : (
          "Enviar link"
        )}
      </Button>
    </form>
  );
}
