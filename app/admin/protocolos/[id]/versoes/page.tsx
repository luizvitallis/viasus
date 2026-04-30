import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Histórico de versões — ViaSus",
};

export default async function VersoesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, title, slug, type, tenant_id")
    .eq("id", id)
    .single();
  if (!protocol) notFound();
  if (protocol.tenant_id !== profile.tenant_id) notFound();

  const { data: versions } = await supabase
    .from("protocol_versions")
    .select("id, version_number, change_note, published_at, published_by, is_current")
    .eq("protocol_id", id)
    .order("version_number", { ascending: false });

  // Carrega nomes dos publishers
  const publisherIds = [
    ...new Set((versions ?? []).map((v) => v.published_by).filter(Boolean) as string[]),
  ];
  const publishers = new Map<string, string>();
  if (publisherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", publisherIds);
    for (const p of profiles ?? []) {
      publishers.set(p.id, p.name ?? p.email);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href={`/admin/protocolos/${id}/editar`}
        className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 mb-6 font-mono uppercase tracking-[0.14em]"
      >
        <ArrowLeft className="size-4" />
        Voltar ao editor
      </Link>

      <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
        Histórico
      </p>
      <h1 className="font-serif font-semibold text-3xl sm:text-4xl text-stone-950 mb-2">
        Versões publicadas
      </h1>
      <p className="text-stone-600 mb-10">
        {protocol.title}
      </p>

      {versions && versions.length > 0 ? (
        <ol className="border-y-2 border-stone-900 divide-y-2 divide-stone-900">
          {versions.map((v) => (
            <li
              key={v.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-6"
            >
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-semibold text-3xl text-stone-950">
                    v{v.version_number}
                  </span>
                  {v.is_current && (
                    <span title="versão atual" className="text-emerald-800">
                      <CircleCheck className="size-5" strokeWidth={2.25} />
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
                  {v.is_current ? "Em produção" : "Histórica"}
                </p>
              </div>

              <div className="lg:col-span-7">
                {v.change_note ? (
                  <p className="text-stone-900 leading-relaxed">{v.change_note}</p>
                ) : (
                  <p className="text-stone-400 italic">Sem nota de mudança.</p>
                )}
                <p className="mt-2 text-sm text-stone-500">
                  Publicado por{" "}
                  <span className="text-stone-700 font-medium">
                    {v.published_by
                      ? publishers.get(v.published_by) ?? "—"
                      : "—"}
                  </span>
                </p>
              </div>

              <div className="lg:col-span-3 lg:text-right text-sm text-stone-500 font-mono">
                {v.published_at
                  ? new Date(v.published_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-2 border-dashed border-stone-300 px-6 py-16 text-center">
          <p className="font-serif text-2xl text-stone-700 mb-2">
            Nenhuma versão publicada ainda.
          </p>
          <p className="text-stone-500">
            Quando você publicar este protocolo, a versão aparece aqui.
          </p>
        </div>
      )}
    </div>
  );
}
