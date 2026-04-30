"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  GitBranch,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  searchTenantContent,
  type SearchResults,
} from "@/app/admin/busca/actions";
import { NODE_TYPE_LABEL, PROTOCOL_TYPE_LABEL } from "@/types/domain";
import type { NodeType, ProtocolType } from "@/types/domain";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    protocols: [],
    nodes: [],
  });
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const trigger = isMac ? e.metaKey : e.ctrlKey;
      if (trigger && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Foco no input ao abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    } else {
      setQuery("");
      setResults({ protocols: [], nodes: [] });
    }
  }, [open]);

  // Busca debounced
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ protocols: [], nodes: [] });
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const data = await searchTenantContent(trimmed);
        setResults(data);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const close = useCallback(() => setOpen(false), []);

  const totalHits = results.protocols.length + results.nodes.length;

  return (
    <>
      {/* Trigger discreto no header — ativável por click ou Ctrl+K */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 px-3 h-9 border-2 border-stone-300 hover:border-stone-900 text-sm text-stone-500 transition-colors"
        title="Buscar (Ctrl+K)"
      >
        <Search className="size-4" />
        <span>Buscar…</span>
        <kbd className="ml-2 px-1.5 py-0.5 bg-stone-100 border border-stone-300 font-mono text-[10px] text-stone-600">
          Ctrl K
        </kbd>
      </button>

      {/* Trigger compacto pra mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center size-9 border-2 border-stone-300 hover:border-stone-900 text-stone-700 transition-colors"
        aria-label="Buscar"
      >
        <Search className="size-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 flex items-start justify-center p-4 sm:pt-24"
          onClick={close}
        >
          <div
            className="w-full max-w-2xl bg-white border-2 border-stone-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-stone-900">
              <Search className="size-5 text-stone-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar protocolos e nós…"
                className="flex-1 bg-transparent outline-none text-base placeholder:text-stone-400"
              />
              {pending && (
                <Loader2 className="size-4 text-stone-500 animate-spin shrink-0" />
              )}
              <button
                type="button"
                onClick={close}
                className="text-stone-500 hover:text-stone-900 shrink-0"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-4 py-8 text-center text-stone-500 text-sm">
                  Digite ao menos 2 caracteres. Atalho:{" "}
                  <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 font-mono text-[10px]">
                    Ctrl K
                  </kbd>{" "}
                  abre/fecha esta busca.
                </p>
              ) : totalHits === 0 && !pending ? (
                <p className="px-4 py-8 text-center text-stone-500 text-sm">
                  Nada encontrado para{" "}
                  <span className="font-mono">&ldquo;{query}&rdquo;</span>.
                </p>
              ) : (
                <>
                  {results.protocols.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                        Protocolos · {results.protocols.length}
                      </p>
                      <ul>
                        {results.protocols.map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/admin/protocolos/${p.id}/editar`}
                              onClick={close}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-stone-100 transition-colors"
                            >
                              <FileText className="size-4 mt-0.5 text-stone-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-stone-950 truncate">
                                  {p.title}
                                </p>
                                <p className="text-xs text-stone-500 font-mono mt-0.5">
                                  {PROTOCOL_TYPE_LABEL[p.type as ProtocolType] ??
                                    p.type}
                                  {p.specialty ? ` · ${p.specialty}` : ""} ·{" "}
                                  {STATUS_LABEL[p.status] ?? p.status}
                                </p>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.nodes.length > 0 && (
                    <div className="border-t border-stone-200">
                      <p className="px-4 pt-3 pb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                        Nós · {results.nodes.length}
                      </p>
                      <ul>
                        {results.nodes.map((n) => (
                          <li key={n.id}>
                            <Link
                              href={`/admin/protocolos/${n.protocolId}/editar`}
                              onClick={close}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-stone-100 transition-colors"
                            >
                              <GitBranch className="size-4 mt-0.5 text-stone-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-stone-950 truncate">
                                  {n.label}
                                </p>
                                <p className="text-xs text-stone-500 font-mono mt-0.5">
                                  {NODE_TYPE_LABEL[n.type as NodeType] ?? n.type}{" "}
                                  · em:{" "}
                                  <span className="text-stone-700">
                                    {n.protocolTitle}
                                  </span>
                                </p>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-4 py-2 border-t border-stone-200 bg-stone-50 text-xs text-stone-500 font-mono uppercase tracking-[0.14em]">
              Busca PT-BR · escopo do seu tenant
            </div>
          </div>
        </div>
      )}
    </>
  );
}
