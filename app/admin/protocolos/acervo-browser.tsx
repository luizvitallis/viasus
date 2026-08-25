"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import {
  PROTOCOL_TYPE_LABEL,
  PROTOCOL_STATUS_LABEL,
} from "@/types/domain";
import { ProtocolRowActions } from "./protocol-row-actions";

interface AcervoProtocol {
  id: string;
  title: string;
  slug: string;
  type: string;
  specialty: string | null;
  summary: string | null;
  status: string;
  updated_at: string;
}

const STATUS_FILTERS = [
  { key: "", label: "Todos" },
  { key: "draft", label: "Rascunhos" },
  { key: "published", label: "Publicados" },
  { key: "archived", label: "Arquivados" },
];

const TYPE_ORDER: { type: string; label: string }[] = [
  { type: "", label: "Todas" },
  { type: "linha_cuidado", label: "Linhas de Cuidado" },
  { type: "pcdt", label: "PCDTs" },
  { type: "encaminhamento", label: "Encaminhamentos" },
  { type: "pop", label: "Administrativos" },
  { type: "diretriz", label: "Diretrizes" },
];

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function filterButton(active: boolean): string {
  return active
    ? "px-3 py-1.5 bg-stone-900 text-stone-50 font-mono text-xs uppercase tracking-[0.14em]"
    : "px-3 py-1.5 border border-stone-300 hover:border-stone-900 font-mono text-xs uppercase tracking-[0.14em] text-stone-700 transition-colors";
}

export function AcervoBrowser({ protocols }: { protocols: AcervoProtocol[] }) {
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = norm(query);
    return protocols.filter(
      (p) =>
        (!status || p.status === status) &&
        (!category || p.type === category) &&
        (!q ||
          norm(p.title).includes(q) ||
          norm(p.slug).includes(q) ||
          (p.specialty ? norm(p.specialty).includes(q) : false)),
    );
  }, [protocols, status, category, query]);

  const grouped = useMemo(() => {
    const g: Record<string, AcervoProtocol[]> = {};
    for (const p of filtered) (g[p.type] ??= []).push(p);
    for (const key of Object.keys(g)) {
      g[key].sort((a, b) =>
        a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }),
      );
    }
    return g;
  }, [filtered]);

  const sections = TYPE_ORDER.filter(
    ({ type }) => type && (grouped[type]?.length ?? 0) > 0,
  );

  return (
    <div>
      {/* Filtro de status */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setStatus(f.key)}
            className={filterButton(status === f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtro de categoria */}
      <div className="flex flex-wrap gap-2 border-b-2 border-stone-900 pb-4 mb-6">
        {TYPE_ORDER.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setCategory(t.type)}
            className={filterButton(category === t.type)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Busca por nome */}
      <div className="mb-8 max-w-xl">
        <label htmlFor="busca-acervo" className="sr-only">
          Buscar protocolo por nome
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
          <input
            id="busca-acervo"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-full h-11 border-2 border-stone-900 bg-white pl-10 pr-4 text-base text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800"
          />
        </div>
        {(query || category || status) && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500">
            {filtered.length} protocolo{filtered.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {sections.length > 0 ? (
        <div className="space-y-12">
          {sections.map(({ type, label }) => {
            const group = grouped[type];
            return (
              <section key={type}>
                <div className="flex items-baseline justify-between border-b-2 border-stone-900 pb-2">
                  <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">
                    {label}
                  </h2>
                  <span className="font-mono text-xs text-stone-400 tracking-[0.14em]">
                    {group.length}
                  </span>
                </div>
                <ol className="border-b-2 border-stone-900 divide-y-2 divide-stone-900">
                  {group.map((p, i) => (
                    <li
                      key={p.id}
                      className="group hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 -mx-6 px-6">
                        <Link
                          href={`/admin/protocolos/${p.id}/editar`}
                          className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 py-6"
                        >
                          <span className="lg:col-span-1 font-mono text-sm tracking-[0.14em] text-stone-500">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="lg:col-span-6">
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                              {PROTOCOL_TYPE_LABEL[
                                p.type as keyof typeof PROTOCOL_TYPE_LABEL
                              ] ?? p.type}
                              {p.specialty ? ` · ${p.specialty}` : ""}
                            </p>
                            <h3 className="font-serif font-medium text-xl text-stone-950 mt-1 group-hover:text-emerald-800 transition-colors">
                              {p.title}
                            </h3>
                            <p className="text-xs text-stone-400 font-mono mt-1">
                              /{p.slug}
                            </p>
                          </div>
                          <div className="lg:col-span-2 flex items-start">
                            <StatusBadge status={p.status} />
                          </div>
                          <div className="lg:col-span-2 lg:text-right text-sm text-stone-500 font-mono">
                            {new Date(p.updated_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="lg:col-span-1 flex lg:justify-end items-start text-stone-400 group-hover:text-emerald-800 transition-colors">
                            <ArrowUpRight className="size-5" />
                          </div>
                        </Link>
                        <ProtocolRowActions
                          protocolId={p.id}
                          title={p.title}
                          status={p.status}
                          type={p.type}
                          specialty={p.specialty}
                          summary={p.summary}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-dashed border-stone-300 px-6 py-14 text-center">
          <p className="font-serif text-xl text-stone-700">
            Nenhum protocolo encontrado com esses filtros.
          </p>
          <p className="text-stone-500 mt-1">
            Ajuste o status, a categoria ou o termo de busca.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "published"
      ? "border-emerald-800 text-emerald-800 bg-emerald-50"
      : status === "draft"
        ? "border-stone-500 text-stone-700 bg-stone-100"
        : "border-stone-400 text-stone-500 bg-stone-50";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 border-2 ${cls} font-mono text-[11px] uppercase tracking-[0.14em]`}
    >
      {PROTOCOL_STATUS_LABEL[status as keyof typeof PROTOCOL_STATUS_LABEL] ?? status}
    </span>
  );
}
