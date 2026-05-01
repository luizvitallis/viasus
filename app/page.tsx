import Link from "next/link";
import { ArrowRight, HeartPulse } from "lucide-react";
import { WaveHeader } from "@/components/decorations/wave-header";
import {
  HealthPattern,
  HealthcareSilhouettes,
} from "@/components/decorations/health-pattern";

const documentTypes = [
  {
    n: "01",
    title: "Linhas de Cuidado",
    body: "Itinerários terapêuticos para condições crônicas — DM2, HAS, gestação, saúde mental — articulando APS, atenção especializada e hospitalar.",
    accent: "border-l-emerald-700",
  },
  {
    n: "02",
    title: "PCDTs",
    body: "Protocolos Clínicos e Diretrizes Terapêuticas da CONITEC, navegáveis por critério de elegibilidade, esquema e seguimento.",
    accent: "border-l-[var(--color-clinical-blue)]",
  },
  {
    n: "03",
    title: "Protocolos de Encaminhamento Regulado",
    body: "Critérios objetivos para encaminhamento à atenção especializada, com sinais de alarme e exames mínimos exigidos.",
    accent: "border-l-[var(--color-caucaia-red)]",
  },
  {
    n: "04",
    title: "Fluxos Administrativos",
    body: "Procedimentos Operacionais Padrão de unidades, passo a passo, com responsabilidade definida em cada nó.",
    accent: "border-l-amber-700",
  },
  {
    n: "05",
    title: "Diretrizes municipais",
    body: "Normativas locais que adaptam diretrizes do Ministério à realidade da rede do município.",
    accent: "border-l-stone-700",
  },
];

const principles = [
  "Fluxograma é a interface primária. PDF é anexo.",
  "Conteúdo é dado, não código — protocolos vivem como JSONB no banco.",
  "Toda ação de escrita gera rastro auditável.",
  "Mobile-first no visualizador. Desktop-first no editor.",
  "Multi-tenancy desde o primeiro commit, isolamento por RLS.",
  "LGPD: nenhum dado de paciente. Apenas usuário e protocolo.",
];

export default function Home() {
  return (
    <>
      {/* Faixa superior decorativa em ondas — paleta institucional Caucaia */}
      <WaveHeader />

      {/* Barra institucional */}
      <header className="bg-[var(--color-caucaia-red)] text-white">
        <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em]">
          <span className="flex items-center gap-2">
            <HeartPulse className="size-3.5 text-white" />
            Secretaria Municipal de Saúde · Caucaia / CE · Atenção Especializada
          </span>
          <span className="hidden sm:inline text-white/75">v1.0 · piloto</span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero institucional — com pattern de saúde sutil + silhuetas */}
        <section className="relative border-b-2 border-stone-900 bg-gradient-to-b from-stone-50 to-white overflow-hidden">
          <HealthPattern opacity={0.05} />
          <HealthcareSilhouettes className="hidden lg:block absolute right-12 bottom-0 w-[280px] h-[210px]" />

          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-8">
              <span className="inline-block w-8 h-px bg-[var(--color-caucaia-red)] align-middle mr-3" />
              Plataforma de Protocolos Clínicos
            </p>

            <h1 className="font-serif font-semibold text-stone-950 leading-[0.95] tracking-tight text-[clamp(3.5rem,11vw,9rem)]">
              ViaSus
            </h1>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7">
                <p className="font-serif text-2xl sm:text-3xl leading-[1.25] text-stone-900">
                  Protocolos clínicos do SUS, navegáveis.
                </p>
                <p className="mt-6 text-stone-700 text-base sm:text-lg leading-relaxed max-w-2xl">
                  Substituímos PDFs estáticos por fluxogramas interativos. O profissional
                  na ponta entra pelo ponto de atenção em que está, segue o ramo
                  relevante e clica em cada nó para receber a orientação clínica daquele
                  passo — com rastro auditável e versão sempre atualizada.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/caucaia-ce"
                    className="inline-flex items-center justify-center gap-2 bg-emerald-800 text-stone-50 font-medium px-6 h-12 hover:bg-emerald-900 transition-colors shadow-sm"
                  >
                    Ver protocolos de Caucaia
                    <ArrowRight className="size-4" strokeWidth={2.25} />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 border-2 border-stone-900 text-stone-900 font-medium px-6 h-12 hover:bg-stone-900 hover:text-stone-50 transition-colors"
                  >
                    Acessar painel
                  </Link>
                </div>
              </div>

              <aside className="lg:col-span-5 lg:border-l-2 lg:border-stone-900 lg:pl-10 flex flex-col justify-end">
                <dl className="font-mono text-[13px] text-stone-700 space-y-3 bg-white/60 backdrop-blur-[2px] border border-stone-200 p-4">
                  <div className="flex justify-between border-b border-stone-300 pb-2">
                    <dt className="uppercase tracking-[0.14em] text-stone-500">Tenant</dt>
                    <dd className="flex items-center gap-1.5">
                      <span className="size-2 bg-[var(--color-caucaia-red)] rounded-full" />
                      Caucaia / CE
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-stone-300 pb-2">
                    <dt className="uppercase tracking-[0.14em] text-stone-500">Domínio</dt>
                    <dd>Atenção Especializada</dd>
                  </div>
                  <div className="flex justify-between border-b border-stone-300 pb-2">
                    <dt className="uppercase tracking-[0.14em] text-stone-500">Estágio</dt>
                    <dd>V1 · em piloto</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="uppercase tracking-[0.14em] text-stone-500">Stack</dt>
                    <dd>Next.js · Supabase · Postgres</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </div>
        </section>

        {/* Cinco tipos de documento — com cor de accent na borda */}
        <section id="documentos" className="border-b-2 border-stone-900 relative bg-white">
          <HealthPattern opacity={0.035} />

          <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
              <p className="lg:col-span-3 font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
                <span className="inline-block w-6 h-px bg-[var(--color-caucaia-red)] align-middle mr-2" />
                Cobertura
              </p>
              <h2 className="lg:col-span-9 font-serif font-medium text-3xl sm:text-4xl text-stone-950 leading-tight">
                Cinco tipos de documento sob um mesmo modelo de grafo.
              </h2>
            </div>

            <ol className="divide-y-2 divide-stone-900 border-y-2 border-stone-900">
              {documentTypes.map((doc) => (
                <li
                  key={doc.n}
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-6 py-7 sm:py-8 group hover:bg-stone-50 transition-colors -mx-6 px-6 border-l-4 ${doc.accent}`}
                >
                  <div className="lg:col-span-2 font-mono text-sm tracking-[0.14em] text-stone-500">
                    {doc.n}
                  </div>
                  <h3 className="lg:col-span-4 font-serif font-medium text-xl sm:text-2xl text-stone-950">
                    {doc.title}
                  </h3>
                  <p className="lg:col-span-6 text-stone-700 leading-relaxed">
                    {doc.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Princípios do projeto — fundo escuro com toques institucionais */}
        <section className="relative bg-stone-950 text-stone-50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-caucaia-red)] via-stone-700 to-emerald-700" />
          <div className="absolute inset-0 opacity-[0.04]">
            <HealthPattern opacity={1} />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400 mb-6">
                  <span className="inline-block w-6 h-px bg-[var(--color-caucaia-red)] align-middle mr-2" />
                  Princípios
                </p>
                <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-tight">
                  Decisões fechadas que guiam cada commit.
                </h2>
              </div>
              <ul className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
                {principles.map((p, i) => (
                  <li
                    key={i}
                    className="flex gap-4 border-t border-stone-700 pt-5 text-stone-200"
                  >
                    <span className="font-mono text-xs text-emerald-400 tracking-[0.14em] mt-1 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé institucional */}
      <footer className="border-t-2 border-stone-900 bg-stone-100 relative">
        {/* Faixa institucional fina */}
        <div className="h-1 bg-gradient-to-r from-[var(--color-caucaia-red)] via-stone-500 to-stone-900" />
        <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs uppercase tracking-[0.14em] text-stone-600">
          <div>
            <p className="text-stone-900 font-medium flex items-center gap-2">
              <HeartPulse className="size-3.5 text-[var(--color-caucaia-red)]" />
              ViaSus
            </p>
            <p className="mt-1 normal-case tracking-normal text-stone-500 font-sans text-sm">
              Construído pela Secretaria Municipal de Saúde de Caucaia.
            </p>
          </div>
          <div>
            <p>Versão 1.0</p>
            <p className="mt-1">V1 · em piloto</p>
          </div>
          <div className="sm:text-right">
            <p>Sem dado de paciente</p>
            <p className="mt-1">LGPD compliant</p>
          </div>
        </div>
      </footer>
    </>
  );
}
