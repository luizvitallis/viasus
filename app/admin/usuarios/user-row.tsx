"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CpfInput } from "@/components/shared/cpf-input";
import { formatCpf } from "@/lib/cpf";
import {
  updateUserAction,
  setUserActiveAction,
  deleteUserAction,
} from "./actions";

interface UserRowUser {
  id: string;
  name: string | null;
  email: string;
  cpf: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

interface UserRowProps {
  index: number;
  user: UserRowUser;
  isSelf: boolean;
  canManage: boolean;
  roleLabel: Record<string, string>;
}

const ROLE_OPTIONS = [
  { value: "gestor", label: "Gestor — gerencia tudo" },
  { value: "curador", label: "Curador — edita protocolos" },
  { value: "publicador", label: "Publicador — edita e publica" },
  { value: "profissional", label: "Profissional — só leitura logada" },
];

export function UserRow({
  index,
  user,
  isSelf,
  canManage,
  roleLabel,
}: UserRowProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Não foi possível concluir.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <li className={`py-5 ${!user.active ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <span className="lg:col-span-1 font-mono text-sm tracking-[0.14em] text-stone-500">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="lg:col-span-4">
          <p className="font-medium text-stone-950">
            {user.name ?? "—"}
            {isSelf && (
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-stone-400">
                você
              </span>
            )}
          </p>
          <p className="text-xs text-stone-500 font-mono">{user.email}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {user.cpf ? (
              <span className="font-mono text-xs text-stone-600">
                {formatCpf(user.cpf)}
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 border border-amber-600 bg-amber-50 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-800">
                sem CPF — não loga
              </span>
            )}
            {!user.active && (
              <span className="inline-flex items-center px-1.5 py-0.5 border border-stone-400 bg-stone-100 font-mono text-[10px] uppercase tracking-[0.12em] text-stone-600">
                inativo
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex items-start">
          <span className="inline-flex items-center px-2.5 py-1 border-2 border-stone-900 font-mono text-[11px] uppercase tracking-[0.14em] text-stone-900 bg-stone-50">
            {roleLabel[user.role] ?? user.role}
          </span>
        </div>

        <div className="lg:col-span-2 text-sm text-stone-500 font-mono">
          Desde{" "}
          {new Date(user.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>

        {canManage && (
          <div className="lg:col-span-3 flex flex-wrap items-center gap-x-3 gap-y-1 lg:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setEditing((v) => !v);
              }}
              className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.12em] text-emerald-800 hover:text-emerald-900 transition-colors disabled:opacity-50"
            >
              <Pencil className="size-3" />
              Editar
            </button>

            {!isSelf && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() => setUserActiveAction(user.id, !user.active))
                }
                className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.12em] text-stone-600 hover:text-stone-900 transition-colors disabled:opacity-50"
              >
                <Power className="size-3" />
                {user.active ? "Inativar" : "Reativar"}
              </button>
            )}

            {!isSelf && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (
                    !confirm(
                      `Excluir "${user.name ?? user.email}" permanentemente?\n\nO acesso é removido de vez. Os protocolos que essa pessoa criou/curou permanecem, mas ficam sem autor. Não dá pra desfazer.`,
                    )
                  ) {
                    return;
                  }
                  run(() => deleteUserAction(user.id));
                }}
                className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.12em] text-stone-500 hover:text-destructive transition-colors disabled:opacity-50"
              >
                <Trash2 className="size-3" />
                Excluir
              </button>
            )}
          </div>
        )}
      </div>

      {editing && canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() =>
              updateUserAction({
                userId: user.id,
                name: String(fd.get("name") ?? ""),
                email: String(fd.get("email") ?? ""),
                role: String(fd.get("role") ?? ""),
                cpf: String(fd.get("cpf") ?? ""),
              }),
            );
          }}
          className="mt-4 border-2 border-stone-900 bg-stone-50 p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${user.id}`}>Nome completo</Label>
              <Input
                id={`name-${user.id}`}
                name="name"
                defaultValue={user.name ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`email-${user.id}`}>Email (para reset de senha)</Label>
              <Input
                id={`email-${user.id}`}
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`cpf-${user.id}`}>CPF</Label>
              <CpfInput
                id={`cpf-${user.id}`}
                name="cpf"
                defaultValue={user.cpf ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`role-${user.id}`}>Papel</Label>
              <select
                id={`role-${user.id}`}
                name="role"
                defaultValue={
                  ROLE_OPTIONS.some((o) => o.value === user.role)
                    ? user.role
                    : "profissional"
                }
                disabled={isSelf}
                className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-base transition-colors focus-visible:border-emerald-800 focus-visible:outline-none disabled:opacity-60"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {isSelf && (
                <p className="text-[11px] text-stone-500">
                  Você não pode mudar o próprio papel.
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={pending}
              className="h-10 rounded-none bg-emerald-800 hover:bg-emerald-900 text-stone-50 px-5"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Salvar"
              )}
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
          </div>
        </form>
      )}

      {!editing && error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </li>
  );
}
