import Link from "next/link";
import { ArrowUpRight, FileText, Users, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard — ViaSus",
};

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const typeLabel: Record<string, string> = {
  linha_cuidado: "Linha de Cuidado",
  pcdt: "PCDT",
  encaminhamento: "Encaminhamento",
  pop: "POP",
  diretriz: "Diretriz",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: protocols } = await supabase
    .from("protocols")
    .select("id, title, slug, type, status, updated_at, specialty")
    .order("updated_at", { ascending: false })
    .limit(3);

  const { count: totalProtocols } = await supabase
    .from("protocols")
    .select("*", { count: "exact", head: true });

  const { count: publishedProtocols } = await supabase
    .from("protocols")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
          Painel
        </p>
        <h1 className="font-serif font-semibold text-4xl text-stone-950">
          Dashboard
        </h1>
      </div>

      {/* Métricas */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-stone-900 mb-12">
        <Stat
          label="Protocolos no tenant"
          value={totalProtocols ?? 0}
          icon={<FileText className="size-5" />}
        />
        <Stat
          label="Publicados"
          value={publishedProtocols ?? 0}
          icon={<ArrowUpRight className="size-5" />}
          accent
          divider
        />
        <Stat
          label="Usuários cadastrados"
          value={totalUsers ?? 0}
          icon={<Users className="size-5" />}
          divider
        />
      </section>

      {/* Lista de protocolos recentes */}
      <section className="mb-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">
              Atividade recente
            </p>
            <h2 className="font-serif font-medium text-2xl text-stone-950">
              Últimos protocolos atualizados
            </h2>
          </div>
          <Link
            href="/admin/protocolos"
            className="text-sm font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-4"
          >
            Ver todos
          </Link>
        </div>

        {protocols && protocols.length > 0 ? (
          <ol className="border-y-2 border-stone-900 divide-y-2 divide-stone-900">
            {protocols.map((p, i) => (
              <li
                key={p.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-6"
              >
                <span className="lg:col-span-1 font-mono text-sm tracking-[0.14em] text-stone-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="lg:col-span-7">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    {typeLabel[p.type] ?? p.type}
                    {p.specialty ? ` · ${p.specialty}` : ""}
                  </p>
                  <h3 className="font-serif font-medium text-xl text-stone-950 mt-1">
                    {p.title}
                  </h3>
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
              </li>
            ))}
          </ol>
        ) : (
          <div className="border-2 border-dashed border-stone-300 px-6 py-12 text-center">
            <p className="text-stone-600">
              Nenhum protocolo cadastrado ainda. O editor de fluxograma chega na
              Fase 3.
            </p>
          </div>
        )}
      </section>

      {/* Atalhos */}
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-4">
          Atalhos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-stone-900">
          <Shortcut
            href="/admin/protocolos"
            icon={<FileText className="size-5" />}
            title="Protocolos"
            body="Liste, edite e publique protocolos do seu tenant."
          />
          <Shortcut
            href="/admin/usuarios"
            icon={<Users className="size-5" />}
            title="Usuários"
            body="Gestor convida curadores e profissionais por email."
            divider
          />
          <Shortcut
            href="/admin/dashboard"
            icon={<Settings className="size-5" />}
            title="Configuração"
            body="Em breve: parâmetros do tenant e personalização visual."
            divider
            disabled
          />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
  divider,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`p-6 ${divider ? "lg:border-l-2 border-stone-900 sm:border-l-2" : ""}`}
    >
      <div className="flex items-center justify-between mb-3 text-stone-500">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
          {label}
        </span>
        {icon}
      </div>
      <p
        className={`font-serif font-medium text-5xl tracking-tight leading-none ${accent ? "text-emerald-800" : "text-stone-950"}`}
      >
        {value}
      </p>
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
      {statusLabel[status] ?? status}
    </span>
  );
}

function Shortcut({
  href,
  icon,
  title,
  body,
  divider,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  divider?: boolean;
  disabled?: boolean;
}) {
  const Wrapper = disabled ? "div" : Link;
  return (
    <Wrapper
      href={href}
      className={`p-6 group ${divider ? "sm:border-l-2 border-stone-900" : ""} ${disabled ? "opacity-60" : "hover:bg-stone-100 transition-colors"}`}
    >
      <div className="flex items-center justify-between mb-3 text-stone-500">
        <span>{icon}</span>
        {!disabled && (
          <ArrowUpRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <h3 className="font-serif font-medium text-xl text-stone-950 mb-1">
        {title}
      </h3>
      <p className="text-sm text-stone-600 leading-relaxed">{body}</p>
    </Wrapper>
  );
}
