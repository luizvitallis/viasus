import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  PROTOCOL_TYPE_LABEL,
  PROTOCOL_STATUS_LABEL,
} from "@/types/domain";

export const metadata = {
  title: "Protocolos — ViaSus",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_FILTERS = [
  { key: undefined, label: "Todos" },
  { key: "draft" as const, label: "Rascunhos" },
  { key: "published" as const, label: "Publicados" },
  { key: "archived" as const, label: "Arquivados" },
];

export default async function ProtocolosPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("protocols")
    .select("id, title, slug, type, specialty, status, updated_at")
    .order("updated_at", { ascending: false });

  if (status === "draft" || status === "published" || status === "archived") {
    query = query.eq("status", status);
  }

  const { data: protocols } = await query;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
            Acervo do tenant
          </p>
          <h1 className="font-serif font-semibold text-4xl text-stone-950">
            Protocolos
          </h1>
        </div>
        <Link
          href="/admin/protocolos/novo"
          className="inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-stone-50 font-medium px-6 h-11 transition-colors w-fit"
        >
          <Plus className="size-4" />
          Novo protocolo
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 border-b-2 border-stone-900 pb-3 mb-6">
        {STATUS_FILTERS.map((f) => {
          const active = (f.key ?? "") === (status ?? "");
          const href = f.key ? `?status=${f.key}` : "/admin/protocolos";
          return (
            <Link
              key={f.label}
              href={href}
              className={
                active
                  ? "px-3 py-1.5 bg-stone-900 text-stone-50 font-mono text-xs uppercase tracking-[0.14em]"
                  : "px-3 py-1.5 border border-stone-300 hover:border-stone-900 font-mono text-xs uppercase tracking-[0.14em] text-stone-700 transition-colors"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Lista */}
      {protocols && protocols.length > 0 ? (
        <ol className="border-y-2 border-stone-900 divide-y-2 divide-stone-900">
          {protocols.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/admin/protocolos/${p.id}/editar`}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-6 group hover:bg-stone-100 transition-colors -mx-6 px-6"
              >
                <span className="lg:col-span-1 font-mono text-sm tracking-[0.14em] text-stone-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="lg:col-span-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    {PROTOCOL_TYPE_LABEL[p.type as keyof typeof PROTOCOL_TYPE_LABEL] ?? p.type}
                    {p.specialty ? ` · ${p.specialty}` : ""}
                  </p>
                  <h2 className="font-serif font-medium text-xl text-stone-950 mt-1 group-hover:text-emerald-800 transition-colors">
                    {p.title}
                  </h2>
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
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-2 border-dashed border-stone-300 px-6 py-16 text-center">
          <p className="font-serif text-2xl text-stone-700 mb-2">
            Nenhum protocolo {status ? `com status "${status}"` : "ainda"}.
          </p>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Comece criando um rascunho. Você pode editar o fluxograma a qualquer
            momento e só publicar quando estiver pronto.
          </p>
          <Link
            href="/admin/protocolos/novo"
            className="inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-stone-50 font-medium px-6 h-11 transition-colors"
          >
            <Plus className="size-4" />
            Criar primeiro protocolo
          </Link>
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
