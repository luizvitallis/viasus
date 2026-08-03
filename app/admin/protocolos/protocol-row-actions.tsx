"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Copy, Pencil, X } from "lucide-react";
import { PROTOCOL_TYPE_LABEL } from "@/types/domain";
import {
  deleteProtocolAction,
  duplicateProtocolAction,
  updateProtocolInfoAction,
} from "./actions";

interface ProtocolRowActionsProps {
  protocolId: string;
  title: string;
  status: string;
  type: string;
  specialty: string | null;
  summary: string | null;
}

const TYPE_OPTIONS = Object.entries(PROTOCOL_TYPE_LABEL) as [string, string][];

export function ProtocolRowActions({
  protocolId,
  title,
  status,
  type,
  specialty,
  summary,
}: ProtocolRowActionsProps) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const willArchive = status !== "draft";
  const confirmMsg = willArchive
    ? `Arquivar "${title}"?\n\nEle sai das listas (pública e do acervo ativo), mas o histórico é preservado e dá pra restaurar depois.`
    : `Excluir "${title}" permanentemente?\n\nIsso apaga o fluxograma, anexos e métricas deste protocolo. NÃO dá pra desfazer.`;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Editar informações */}
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          setEditing(true);
        }}
        className="inline-flex items-center justify-center size-9 border-2 border-stone-300 hover:border-stone-900 hover:text-stone-900 text-stone-500 transition-colors disabled:opacity-50"
        title="Editar informações"
        aria-label={`Editar informações de ${title}`}
      >
        <Pencil className="size-4" />
      </button>

      {/* Duplicar */}
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startTransition(async () => {
            const res = await duplicateProtocolAction(protocolId);
            if (!res.ok || !res.newId) {
              alert(res.error ?? "Erro ao duplicar.");
              return;
            }
            router.push(`/admin/protocolos/${res.newId}/editar`);
          });
        }}
        className="inline-flex items-center justify-center size-9 border-2 border-stone-300 hover:border-emerald-800 hover:text-emerald-800 text-stone-500 transition-colors disabled:opacity-50"
        title="Duplicar"
        aria-label={`Duplicar ${title}`}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>

      {/* Excluir / Arquivar */}
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!confirm(confirmMsg)) return;
          startTransition(async () => {
            const res = await deleteProtocolAction(protocolId);
            if (!res.ok) {
              alert(res.error ?? "Erro ao processar.");
              return;
            }
            router.refresh();
          });
        }}
        className="inline-flex items-center justify-center size-9 border-2 border-stone-300 hover:border-destructive hover:text-destructive text-stone-500 transition-colors disabled:opacity-50"
        title={willArchive ? "Arquivar" : "Excluir"}
        aria-label={willArchive ? `Arquivar ${title}` : `Excluir ${title}`}
      >
        <Trash2 className="size-4" />
      </button>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4"
          onClick={() => {
            if (!pending) setEditing(false);
          }}
        >
          <div
            className="bg-white border-2 border-stone-900 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-stone-900 px-5 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">
                Editar informações
              </p>
              <button
                type="button"
                onClick={() => !pending && setEditing(false)}
                className="text-stone-500 hover:text-stone-900"
                disabled={pending}
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setError(null);
                startTransition(async () => {
                  try {
                    const res = await updateProtocolInfoAction({
                      protocolId,
                      title: String(fd.get("title") ?? ""),
                      type: String(fd.get("type") ?? ""),
                      specialty: String(fd.get("specialty") ?? "") || null,
                      summary: String(fd.get("summary") ?? "") || null,
                    });
                    if (!res.ok) {
                      setError(res.error ?? "Erro ao salvar.");
                      return;
                    }
                    setEditing(false);
                    router.refresh();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? `Falha: ${err.message}`
                        : "Falha inesperada ao salvar.",
                    );
                  }
                });
              }}
              className="p-5 space-y-4"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor={`title-${protocolId}`}
                  className="text-sm font-medium text-stone-900"
                >
                  Título
                </label>
                <input
                  id={`title-${protocolId}`}
                  name="title"
                  defaultValue={title}
                  required
                  className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-base focus-visible:border-emerald-800 focus-visible:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`type-${protocolId}`}
                    className="text-sm font-medium text-stone-900"
                  >
                    Tipo de documento
                  </label>
                  <select
                    id={`type-${protocolId}`}
                    name="type"
                    defaultValue={type}
                    className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-base focus-visible:border-emerald-800 focus-visible:outline-none"
                  >
                    {TYPE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`specialty-${protocolId}`}
                    className="text-sm font-medium text-stone-900"
                  >
                    Especialidade (opcional)
                  </label>
                  <input
                    id={`specialty-${protocolId}`}
                    name="specialty"
                    defaultValue={specialty ?? ""}
                    placeholder="Ex.: Endocrinologia"
                    className="flex h-10 w-full border-2 border-stone-300 bg-transparent px-3 py-1 text-base focus-visible:border-emerald-800 focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`summary-${protocolId}`}
                  className="text-sm font-medium text-stone-900"
                >
                  Resumo (opcional)
                </label>
                <textarea
                  id={`summary-${protocolId}`}
                  name="summary"
                  defaultValue={summary ?? ""}
                  rows={3}
                  className="flex w-full border-2 border-stone-300 bg-transparent px-3 py-2 text-base focus-visible:border-emerald-800 focus-visible:outline-none"
                />
              </div>

              <p className="text-xs text-stone-500">
                Mudar o tipo pode trocar o editor (fluxograma ↔ checklist de
                Encaminhamento). O endereço público (slug) não muda.
              </p>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-stone-50 font-medium px-5 h-10 transition-colors disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Salvar"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => !pending && setEditing(false)}
                  className="text-xs font-mono uppercase tracking-[0.12em] text-stone-500 hover:text-stone-900 transition-colors"
                >
                  cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
