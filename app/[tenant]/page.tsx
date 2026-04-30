import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ProtocolType } from "@/types/domain";

interface TenantPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tipo?: string }>;
}

const TABS: {
  value: ProtocolType;
  label: string;
  description: string;
}[] = [
  {
    value: "linha_cuidado",
    label: "Linhas de Cuidado",
    description:
      "Itinerários terapêuticos para condições crônicas, articulando APS, atenção especializada e hospitalar.",
  },
  {
    value: "pcdt",
    label: "PCDTs",
    description:
      "Protocolos Clínicos e Diretrizes Terapêuticas, navegáveis por critério de elegibilidade, esquema e seguimento.",
  },
  {
    value: "encaminhamento",
    label: "Encaminhamentos",
    description:
      "Critérios objetivos para encaminhamento à atenção especializada, com sinais, sintomas e exames.",
  },
  {
    value: "pop",
    label: "Administrativos",
    description:
      "Fluxos administrativos: quem encaminha, em qual sistema, quais documentos anexar e levar.",
  },
];

const typeShortLabel: Record<string, string> = {
  linha_cuidado: "Linha de Cuidado",
  pcdt: "PCDT",
  encaminhamento: "Encaminhamento",
  pop: "Administrativo",
  diretriz: "Diretriz",
};

export async function generateMetadata({ params, searchParams }: TenantPageProps) {
  const { tenant } = await params;
  const { tipo } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("name")
    .eq("subdomain", tenant)
    .maybeSingle();

  if (!data) {
    return { title: "Município não encontrado — ViaSus" };
  }

  const tab = TABS.find((t) => t.value === tipo);
  const suffix = tab ? ` · ${tab.label}` : "";

  return {
    title: `${data.name}${suffix} — ViaSus`,
    description: `Protocolos clínicos publicados de ${data.name}.`,
  };
}

export default async function TenantPage({
  params,
  searchParams,
}: TenantPageProps) {
  const { tenant } = await params;
  const { tipo } = await searchParams;
  const supabase = await createClient();

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, name, subdomain")
    .eq("subdomain", tenant)
    .maybeSingle();

  if (!tenantRow) notFound();

  // Aba ativa: a especificada na URL ou a primeira por padrão
  const activeTab = TABS.find((t) => t.value === tipo) ?? TABS[0];

  // Conta total por aba (pra mostrar badge nas tabs e header)
  const { data: allPublished } = await supabase
    .from("protocols")
    .select("id, type")
    .eq("tenant_id", tenantRow.id)
    .eq("status", "published");

  const counts: Record<string, number> = {};
  for (const p of allPublished ?? []) {
    counts[p.type] = (counts[p.type] ?? 0) + 1;
  }

  // Lista filtrada pela aba ativa
  const { data: protocols } = await supabase
    .from("protocols")
    .select("id, title, slug, type, specialty, summary, updated_at")
    .eq("tenant_id", tenantRow.id)
    .eq("status", "published")
    .eq("type", activeTab.value)
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Faixa institucional */}
      <header className="bg-stone-950 text-stone-50">
        <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em]">
          <Link href="/" className="hover:text-stone-300 transition-colors">
            ViaSus · plataforma
          </Link>
          <span className="hidden sm:inline text-stone-400">acesso público</span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero do tenant */}
        <section className="border-b-2 border-stone-900">
          <div className="mx-auto max-w-6xl px-6 pt-12 pb-8 sm:pt-20 sm:pb-12">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-4">
              Protocolos clínicos · /{tenantRow.subdomain}
            </p>
            <h1 className="font-serif font-semibold text-stone-950 leading-[0.98] tracking-tight text-[clamp(2.5rem,7vw,5.5rem)]">
              {tenantRow.name}
            </h1>
          </div>

          {/* Abas */}
          <nav
            aria-label="Categorias de protocolo"
            className="mx-auto max-w-6xl px-6"
          >
            <ul className="flex flex-wrap gap-0 border-x-2 border-t-2 border-stone-900">
              {TABS.map((t) => {
                const active = t.value === activeTab.value;
                const count = counts[t.value] ?? 0;
                return (
                  <li key={t.value} className="flex-1 min-w-[140px]">
                    <Link
                      href={`/${tenantRow.subdomain}?tipo=${t.value}`}
                      aria-current={active ? "page" : undefined}
                      className={`flex flex-col items-start gap-1 px-4 py-3 border-b-2 ${
                        active
                          ? "bg-stone-900 text-stone-50 border-stone-900"
                          : "bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100"
                      } transition-colors`}
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                        {t.label}
                      </span>
                      <span
                        className={`font-serif text-2xl font-medium ${
                          active ? "text-stone-50" : "text-stone-900"
                        }`}
                      >
                        {count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </section>

        {/* Descrição da aba ativa */}
        <section className="bg-stone-100 border-b-2 border-stone-900">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <p className="text-stone-700 max-w-3xl leading-relaxed">
              {activeTab.description}
            </p>
          </div>
        </section>

        {/* Lista */}
        <section className="border-b-2 border-stone-900">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            {protocols && protocols.length > 0 ? (
              <ol className="border-y-2 border-stone-900 divide-y-2 divide-stone-900">
                {protocols.map((p, i) => (
                  <li key={p.id}>
                    <Link
                      href={`/${tenantRow.subdomain}/protocolos/${p.slug}`}
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
              <div className="border-2 border-dashed border-stone-300 px-6 py-16 text-center">
                <p className="font-serif text-2xl text-stone-700 mb-2">
                  Nenhum {activeTab.label.toLowerCase().replace(/s$/, "")}{" "}
                  publicado ainda.
                </p>
                <p className="text-stone-500 max-w-md mx-auto">
                  {activeTab.value === "encaminhamento"
                    ? "Os protocolos de encaminhamento interativos chegam na próxima fase."
                    : activeTab.value === "pop"
                      ? "Os fluxos administrativos chegam na próxima fase."
                      : `Os curadores de ${tenantRow.name} estão preparando esse conteúdo. Volte em breve.`}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="bg-stone-100">
        <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs uppercase tracking-[0.14em] text-stone-600">
          <div>
            <p className="text-stone-900 font-medium">ViaSus</p>
            <p className="mt-1 normal-case tracking-normal text-stone-500 font-sans text-sm">
              Protocolos clínicos do SUS, navegáveis.
            </p>
          </div>
          <div>
            <p>{tenantRow.name}</p>
            <p className="mt-1">/{tenantRow.subdomain}</p>
          </div>
          <div className="sm:text-right">
            <p>Sem dado de paciente</p>
            <p className="mt-1">LGPD compliant</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
