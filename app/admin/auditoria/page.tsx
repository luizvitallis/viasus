import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Auditoria — ViaSus",
};

const ACTION_LABEL: Record<string, string> = {
  create: "criou",
  update: "atualizou",
  delete_node: "excluiu nó",
  publish: "publicou",
  archive: "arquivou",
  fork: "ramificou",
  view: "visualizou",
};

const ACTION_COLOR: Record<string, string> = {
  create: "border-emerald-800 text-emerald-800",
  update: "border-stone-700 text-stone-700",
  delete_node: "border-red-700 text-red-700",
  publish: "border-emerald-800 text-emerald-800",
  archive: "border-stone-500 text-stone-600",
  fork: "border-stone-700 text-stone-700",
  view: "border-stone-400 text-stone-500",
};

interface PageProps {
  searchParams: Promise<{ before?: string }>;
}

const PAGE_SIZE = 50;

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const { before } = await searchParams;
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

  if (!["gestor", "admin"].includes(profile.role)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-stone-950 mb-2">
          Sem acesso
        </h1>
        <p className="text-stone-600">
          A auditoria é restrita a gestores e administradores. Seu papel:{" "}
          <span className="font-mono">{profile.role}</span>.
        </p>
      </div>
    );
  }

  let query = supabase
    .from("protocol_audit")
    .select("id, action, payload, occurred_at, protocol_id, user_id")
    .order("occurred_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (before) {
    query = query.lt("occurred_at", before);
  }

  const { data: events } = await query;

  // Resolver names dos usuários e títulos dos protocolos em batch
  const userIds = [
    ...new Set((events ?? []).map((e) => e.user_id).filter(Boolean) as string[]),
  ];
  const protocolIds = [
    ...new Set(
      (events ?? []).map((e) => e.protocol_id).filter(Boolean) as string[],
    ),
  ];

  const [{ data: profiles }, { data: protocols }] = await Promise.all([
    userIds.length
      ? supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; email: string }[] }),
    protocolIds.length
      ? supabase
          .from("protocols")
          .select("id, title, slug")
          .in("id", protocolIds)
      : Promise.resolve({ data: [] as { id: string; title: string; slug: string }[] }),
  ]);

  const usersMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.name ?? p.email]),
  );
  const protocolsMap = new Map(
    (protocols ?? []).map((p) => [p.id, { title: p.title, slug: p.slug }]),
  );

  const oldestOccurredAt = events?.[events.length - 1]?.occurred_at ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
        Trilha de eventos
      </p>
      <h1 className="font-serif font-semibold text-4xl text-stone-950 mb-2">
        Auditoria
      </h1>
      <p className="text-stone-600 mb-10 max-w-3xl">
        Quem fez o quê, quando. Eventos de escrita são registrados de forma
        imutável. Eventos de auth (login, convite) virão na próxima migração.
      </p>

      {events && events.length > 0 ? (
        <>
          <ol className="border-y-2 border-stone-900 divide-y border-stone-200">
            {events.map((e) => {
              const userName = e.user_id
                ? usersMap.get(e.user_id) ?? "—"
                : "sistema";
              const protocol = e.protocol_id
                ? protocolsMap.get(e.protocol_id)
                : null;

              return (
                <li
                  key={e.id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-3 py-4"
                >
                  <div className="lg:col-span-2 font-mono text-xs text-stone-500">
                    {new Date(e.occurred_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="lg:col-span-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 border ${ACTION_COLOR[e.action] ?? "border-stone-300 text-stone-600"} font-mono text-[11px] uppercase tracking-[0.14em] bg-white`}
                    >
                      {ACTION_LABEL[e.action] ?? e.action}
                    </span>
                  </div>
                  <div className="lg:col-span-3">
                    <p className="text-sm text-stone-900">{userName}</p>
                  </div>
                  <div className="lg:col-span-5">
                    {protocol ? (
                      <Link
                        href={`/admin/protocolos/${e.protocol_id}/editar`}
                        className="text-sm text-stone-900 hover:text-emerald-800 underline underline-offset-2"
                      >
                        {protocol.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-stone-500 italic">
                        sem protocolo
                      </span>
                    )}
                    {e.payload &&
                      typeof e.payload === "object" &&
                      Object.keys(e.payload).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-700">
                            payload
                          </summary>
                          <pre className="mt-1 text-xs font-mono bg-stone-100 p-2 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(e.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                  </div>
                </li>
              );
            })}
          </ol>

          {events.length === PAGE_SIZE && oldestOccurredAt && (
            <div className="mt-6 text-center">
              <Link
                href={`?before=${encodeURIComponent(oldestOccurredAt)}`}
                className="inline-flex items-center gap-2 border-2 border-stone-900 hover:bg-stone-900 hover:text-stone-50 font-mono text-xs uppercase tracking-[0.14em] px-4 h-10 transition-colors"
              >
                Carregar mais antigos
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="border-2 border-dashed border-stone-300 px-6 py-16 text-center">
          <p className="font-serif text-2xl text-stone-700 mb-2">
            Sem eventos {before ? "antes desse ponto" : "ainda"}.
          </p>
          {before && (
            <Link
              href="/admin/auditoria"
              className="inline-block mt-4 underline text-emerald-800"
            >
              Ver eventos mais recentes
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
