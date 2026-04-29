import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface TenantPageProps {
  params: Promise<{ tenant: string }>;
}

const typeLabel: Record<string, string> = {
  linha_cuidado: "Linha de Cuidado",
  pcdt: "PCDT",
  encaminhamento: "Encaminhamento Regulado",
  pop: "POP",
  diretriz: "Diretriz",
};

export async function generateMetadata({ params }: TenantPageProps) {
  const { tenant } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("name")
    .eq("subdomain", tenant)
    .maybeSingle();

  if (!data) {
    return { title: "Município não encontrado — ViaSus" };
  }

  return {
    title: `${data.name} — ViaSus`,
    description: `Protocolos clínicos publicados de ${data.name}.`,
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenant } = await params;
  const supabase = await createClient();

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, name, subdomain")
    .eq("subdomain", tenant)
    .maybeSingle();

  if (!tenantRow) notFound();

  const { data: protocols } = await supabase
    .from("protocols")
    .select("id, title, slug, type, specialty, summary, updated_at")
    .eq("tenant_id", tenantRow.id)
    .eq("status", "published")
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
          <div className="mx-auto max-w-6xl px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-4">
              Protocolos clínicos · /{tenantRow.subdomain}
            </p>
            <h1 className="font-serif font-semibold text-stone-950 leading-[0.98] tracking-tight text-[clamp(2.5rem,7vw,5.5rem)]">
              {tenantRow.name}
            </h1>
            <p className="mt-6 max-w-2xl text-stone-700 text-lg leading-relaxed">
              {protocols?.length ?? 0} protocolo(s) publicado(s) no momento.
              Clique em qualquer um para abrir o fluxograma navegável.
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
                          {typeLabel[p.type] ?? p.type}
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
                  Nenhum protocolo publicado ainda.
                </p>
                <p className="text-stone-500 max-w-md mx-auto">
                  Os curadores do tenant {tenantRow.name} estão preparando os
                  primeiros fluxogramas. Volte em breve.
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
