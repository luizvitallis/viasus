"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Copy } from "lucide-react";
import { deleteProtocolAction, duplicateProtocolAction } from "./actions";

interface ProtocolRowActionsProps {
  protocolId: string;
  title: string;
  status: string;
}

export function ProtocolRowActions({
  protocolId,
  title,
  status,
}: ProtocolRowActionsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Heurística só pro texto do confirm — o servidor decide de fato pela
  // existência de versões publicadas (rascunho ⇒ exclui; publicado ⇒ arquiva).
  const willArchive = status !== "draft";
  const confirmMsg = willArchive
    ? `Arquivar "${title}"?\n\nEle sai das listas (pública e do acervo ativo), mas o histórico é preservado e dá pra restaurar depois.`
    : `Excluir "${title}" permanentemente?\n\nIsso apaga o fluxograma, anexos e métricas deste protocolo. NÃO dá pra desfazer.`;

  return (
    <div className="flex items-center gap-2 shrink-0">
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
            // Abre a cópia no editor pra ajustar o título e o que precisar.
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
    </div>
  );
}
