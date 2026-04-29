"use client";

import { useActionState, useState } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUserAction, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState | undefined, FormData>(
    inviteUserAction,
    undefined,
  );
  const [copied, setCopied] = useState(false);

  if (state?.success) {
    return (
      <div className="space-y-5">
        <div
          role="status"
          className="border-l-2 border-emerald-800 bg-emerald-50 px-4 py-4"
        >
          <p className="font-medium text-emerald-950">
            Editor cadastrado: {state.success.name}
          </p>
          <p className="mt-1 text-sm text-emerald-900">
            Compartilhe com {state.success.email} a senha temporária abaixo via
            canal seguro (não envie por chat público). Ele pode trocá-la depois
            de logar.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-stone-700">Senha temporária</Label>
          <div className="flex gap-2">
            <code className="flex-1 px-4 py-3 border-2 border-stone-900 bg-stone-100 font-mono text-base text-stone-950 select-all">
              {state.success.tempPassword}
            </code>
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-2 border-stone-900 hover:bg-stone-900 hover:text-stone-50 h-auto"
              onClick={() => {
                navigator.clipboard.writeText(state.success!.tempPassword);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Copiar
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-stone-500 font-mono uppercase tracking-[0.14em]">
            Esta senha não será mostrada novamente.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="rounded-none"
          onClick={() => window.location.reload()}
        >
          Convidar outro editor
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Maria Silva"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
          />
          {state?.fieldErrors?.name && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.name[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email institucional</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="maria.silva@caucaia.ce.gov.br"
            aria-invalid={Boolean(state?.fieldErrors?.email)}
          />
          {state?.fieldErrors?.email && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.email[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <select
          id="role"
          name="role"
          required
          defaultValue="curador"
          className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:border-emerald-800 focus-visible:outline-none focus-visible:ring-0"
          aria-invalid={Boolean(state?.fieldErrors?.role)}
        >
          <option value="curador">Curador — edita protocolos</option>
          <option value="publicador">Publicador — edita e publica</option>
          <option value="profissional">Profissional — só leitura logada</option>
        </select>
        {state?.fieldErrors?.role && (
          <p className="text-sm text-destructive">{state.fieldErrors.role[0]}</p>
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
            Cadastrando…
          </>
        ) : (
          "Cadastrar editor"
        )}
      </Button>
    </form>
  );
}
