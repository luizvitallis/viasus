"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProtocolAction,
  type NewProtocolState,
} from "./actions";
import { PROTOCOL_TYPE_LABEL } from "@/types/domain";

export function NewProtocolForm() {
  const [state, action, pending] = useActionState<
    NewProtocolState | undefined,
    FormData
  >(createProtocolAction, undefined);

  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Ex.: Linha de Cuidado em Hipertensão Arterial — APS Caucaia"
          aria-invalid={Boolean(state?.fieldErrors?.title)}
        />
        {state?.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo de documento</Label>
          <select
            id="type"
            name="type"
            required
            defaultValue="linha_cuidado"
            className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-base focus-visible:border-emerald-800 focus-visible:outline-none"
            aria-invalid={Boolean(state?.fieldErrors?.type)}
          >
            {Object.entries(PROTOCOL_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.type && (
            <p className="text-sm text-destructive">{state.fieldErrors.type[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialty">Especialidade (opcional)</Label>
          <Input
            id="specialty"
            name="specialty"
            placeholder="Ex.: Endocrinologia, Pediatria"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Resumo (opcional)</Label>
        <textarea
          id="summary"
          name="summary"
          rows={3}
          placeholder="Quem é o público-alvo? O que esse protocolo cobre?"
          className="flex w-full border-2 border-stone-300 bg-transparent px-3 py-2 text-base focus-visible:border-emerald-800 focus-visible:outline-none resize-y"
        />
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
            Criando…
          </>
        ) : (
          "Criar e abrir editor"
        )}
      </Button>
    </form>
  );
}
