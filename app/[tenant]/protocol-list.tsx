"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

interface ProtocolItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  specialty: string | null;
  summary: string | null;
  updated_at: string;
}

interface ProtocolListProps {
  protocols: ProtocolItem[];
  subdomain: string;
  typeShortLabel: Record<string, string>;
  emptyTitle: string;
  emptySub: string;
}

/** Normaliza pra busca: sem acento, minúsculo. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function ProtocolList({
  protocols,
  subdomain,
  typeShortLabel,
  emptyTitle,
  emptySub,
}: ProtocolListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return protocols;
    return protocols.filter(
      (p) =>
        norm(p.title).includes(q) ||
        (p.specialty ? norm(p.specialty).includes(q) : false) ||
        (p.summary ? norm(p.summary).includes(q) : false),
    );
  }, [query, protocols]);

  // Nada publicado nesta aba
  if (protocols.length === 0) {
    return (
      <div className="border-2 border-dashed border-stone-300 px-6 py-16 text-center">
        <p className="font-serif text-2xl text-stone-700 mb-2">{emptyTitle}</p>
        <p className="text-stone-500 max-w-md mx-auto">{emptySub}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Campo de busca */}
      <div className="mb-8 max-w-xl">
        <label htmlFor="busca-protocolo" className="sr-only">
          Buscar protocolo por nome
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
          <input
            id="busca-protocolo"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-full h-11 border-2 border-stone-900 bg-white pl-10 pr-4 text-base text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800"
          />
        </div>
        {query && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"} para “{query}”
          </p>
        )}
      </div>

      {filtered.length > 0 ? (
        <ol className="border-y-2 border-stone-900 divide-y-2 divide-stone-900">
          {filtered.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/${subdomain}/protocolos/${p.slug}`}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-7 sm:py-8 group hover:bg-stone-100 transition-colors -mx-6 px-6"
              >
                <div className="lg:col-span-1 font-mono text-sm tracking-[0.14em] text-stone-500">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="lg:col-span-7">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    {typeShortLabel[p.type] ?? p.type}
                    {p.specialty ? ` · ${p.specialty}` : ""}
                  </p>
                  <h2 className="font-serif font-medium text-2xl text-stone-950 mt-2 group-hover:text-emerald-800 transition-colors">
                    {p.title}
                  </h2>
                  {p.summary && (
                    <p className="mt-3 text-stone-700 leading-relaxed line-clamp-2">
                      {p.summary}
                    </p>
                  )}
                </div>
                <div className="lg:col-span-3 lg:text-right text-sm text-stone-500 font-mono">
                  Atualizado em{" "}
                  {new Date(p.updated_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="lg:col-span-1 flex lg:justify-end items-start">
                  <ArrowRight
                    className="size-5 text-stone-400 group-hover:text-emerald-800 group-hover:translate-x-1 transition-all"
                    strokeWidth={2}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-2 border-dashed border-stone-300 px-6 py-14 text-center">
          <p className="font-serif text-xl text-stone-700">
            Nenhum protocolo encontrado para “{query}”.
          </p>
          <p className="text-stone-500 mt-1">Tente outro termo.</p>
        </div>
      )}
    </div>
  );
}
