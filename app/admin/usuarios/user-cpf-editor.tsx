"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CpfInput } from "@/components/shared/cpf-input";
import { formatCpf } from "@/lib/cpf";
import { updateUserCpfAction } from "./actions";

interface UserCpfEditorProps {
  userId: string;
  currentCpf: string | null;
  canEdit: boolean;
}

export function UserCpfEditor({
  userId,
  currentCpf,
  canEdit,
}: UserCpfEditorProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {currentCpf ? (
          <span className="font-mono text-sm text-stone-600">
            {formatCpf(currentCpf)}
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 border border-amber-600 bg-amber-50 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-800">
            sem CPF — não loga
          </span>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.12em] text-emerald-800 hover:text-emerald-900 transition-colors"
          >
            <Pencil className="size-3" />
            {currentCpf ? "editar" : "definir"}
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const cpf = String(fd.get("cpf") ?? "");
        startTransition(async () => {
          const res = await updateUserCpfAction(userId, cpf);
          if (!res.ok) {
            setError(res.error ?? "Erro ao salvar.");
            return;
          }
          setEditing(false);
          router.refresh();
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <CpfInput
        name="cpf"
        defaultValue={currentCpf ?? ""}
        required
        aria-invalid={Boolean(error)}
      />
      <Button
        type="submit"
        disabled={pending}
        className="h-9 rounded-none bg-emerald-800 hover:bg-emerald-900 text-stone-50 px-4"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setEditing(false);
        }}
        className="text-xs font-mono uppercase tracking-[0.12em] text-stone-500 hover:text-stone-900 transition-colors"
      >
        cancelar
      </button>
      {error && (
        <p className="w-full text-sm text-destructive">{error}</p>
      )}
    </form>
  );
}
