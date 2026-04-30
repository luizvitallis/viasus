"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAttachmentAction } from "./actions";

interface DeleteButtonProps {
  attachmentId: string;
  filename: string;
}

export function DeleteButton({ attachmentId, filename }: DeleteButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remover o anexo "${filename}"? Esta ação não pode ser desfeita.`)) {
          return;
        }
        startTransition(async () => {
          const result = await deleteAttachmentAction(attachmentId);
          if (!result.ok) {
            alert(result.error ?? "Erro ao remover.");
          }
        });
      }}
      className="inline-flex items-center justify-center size-9 border-2 border-stone-300 hover:border-destructive hover:text-destructive text-stone-700 transition-colors disabled:opacity-50"
      title="Remover"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
