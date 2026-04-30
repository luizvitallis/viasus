"use client";

import { useActionState, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadAttachmentAction, type UploadResult } from "./actions";

interface UploadFormProps {
  protocolId: string;
}

export function UploadForm({ protocolId }: UploadFormProps) {
  const action = uploadAttachmentAction.bind(null, protocolId);
  const [state, dispatch, pending] = useActionState<
    UploadResult | undefined,
    FormData
  >(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset do form após upload bem-sucedido
  if (state?.ok && formRef.current) {
    formRef.current.reset();
  }

  return (
    <form
      ref={formRef}
      action={dispatch}
      className="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
    >
      <input
        type="file"
        name="file"
        required
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="block flex-1 text-sm text-stone-700 file:mr-3 file:py-2 file:px-4 file:border-2 file:border-stone-900 file:bg-stone-50 file:text-sm file:font-medium hover:file:bg-stone-900 hover:file:text-stone-50 file:transition-colors"
      />
      <Button
        type="submit"
        disabled={pending}
        className="bg-emerald-800 hover:bg-emerald-900 text-stone-50 h-10 px-5 rounded-none w-fit"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Enviando…
          </>
        ) : (
          <>
            <Upload className="size-4" />
            Anexar
          </>
        )}
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
