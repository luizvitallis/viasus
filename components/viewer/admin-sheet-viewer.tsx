"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { AdminSheetDocument } from "@/components/shared/admin-sheet-document";
import { adminSheetToText } from "@/lib/admin-sheet";
import type { AdminSheet } from "@/types/domain";
import { trackUsage } from "./track-usage";

interface AdminSheetViewerProps {
  tenantId: string;
  protocolId: string;
  versionId: string | null;
  title: string;
  sheet: AdminSheet;
  versionNumber: number | null;
  publishedAt: string | null;
}

export function AdminSheetViewer({
  tenantId,
  protocolId,
  versionId,
  title,
  sheet,
  versionNumber,
  publishedAt,
}: AdminSheetViewerProps) {
  const [copied, setCopied] = useState(false);

  // Track open_protocol on mount
  useEffect(() => {
    trackUsage({ tenantId, protocolId, versionId, action: "open_protocol" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(adminSheetToText(title, sheet));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-[54rem] px-4 sm:px-6 py-6 sm:py-8">
        <AdminSheetDocument
          title={title}
          sheet={sheet}
          versionNumber={versionNumber}
          updatedAt={publishedAt}
        />
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-stone-50 font-medium px-4 h-10 transition-colors"
          >
            <Printer className="size-4" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 border-2 border-stone-900 hover:bg-stone-900 hover:text-stone-50 font-medium px-4 h-10 transition-colors"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado" : "Copiar lista"}
          </button>
        </div>
      </div>
    </main>
  );
}
