import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Eye, MousePointerClick } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Métricas — ViaSus",
};

const DAYS = 30;

export default async function MetricasPage() {
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
        <h1 className="font-serif text-3xl text-stone-950 mb-2">Sem acesso</h1>
        <p className="text-stone-600">
          As métricas são restritas a gestores e administradores.
        </p>
      </div>
    );
  }

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

  // RLS já filtra por tenant_id automaticamente
  const { data: events } = await supabase
    .from("protocol_usage")
    .select("action, protocol_id, node_id, occurred_at")
    .gte("occurred_at", since)
    .limit(20000); // hard cap defensivo

  const totalOpens =
    events?.filter((e) => e.action === "open_protocol").length ?? 0;
  const totalClicks =
    events?.filter((e) => e.action === "click_node").length ?? 0;
  const totalEvents = events?.length ?? 0;

  // Top protocolos por open_protocol
  const protocolCounts = new Map<string, number>();
  for (const e of events ?? []) {
    if (e.action === "open_protocol" && e.protocol_id) {
      protocolCounts.set(
        e.protocol_id,
        (protocolCounts.get(e.protocol_id) ?? 0) + 1,
      );
    }
  }
  const topProtocols = [...protocolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top nós por click_node
  const nodeCounts = new Map<string, { count: number; protocolId: string }>();
  for (const e of events ?? []) {
    if (e.action === "click_node" && e.node_id && e.protocol_id) {
      const cur = nodeCounts.get(e.node_id);
      nodeCounts.set(e.node_id, {
        count: (cur?.count ?? 0) + 1,
        protocolId: e.protocol_id,
      });
    }
  }
  const topNodes = [...nodeCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // Resolve títulos
  const protocolIds = [
    ...new Set([
      ...topProtocols.map(([id]) => id),
      ...topNodes.map(([, v]) => v.protocolId),
    ]),
  ];
  const nodeIds = topNodes.map(([id]) => id);

  const [{ data: protocols }, { data: nodes }] = await Promise.all([
    protocolIds.length
      ? supabase.from("protocols").select("id, title").in("id", protocolIds)
      : Promise.resolve({
          data: [] as { id: string; title: string }[],
        }),
    nodeIds.length
      ? supabase.from("nodes").select("id, label").in("id", nodeIds)
      : Promise.resolve({ data: [] as { id: string; label: string }[] }),
  ]);

  const protocolTitleMap = new Map(
    (protocols ?? []).map((p) => [p.id, p.title]),
  );
  const nodeLabelMap = new Map((nodes ?? []).map((n) => [n.id, n.label]));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
        Adesão · últimos {DAYS} dias
      </p>
      <h1 className="font-serif font-semibold text-4xl text-stone-950 mb-2">
        Métricas
      </h1>
      <p className="text-stone-600 mb-10 max-w-3xl">
        Eventos de uso registrados pelo visualizador público. Sem dado de
        paciente — apenas contagens agregadas.
      </p>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-stone-900 mb-12">
        <Stat label="Aberturas de protocolo" value={totalOpens} icon={<Eye className="size-5" />} accent />
        <Stat
          label="Cliques em nós"
          value={totalClicks}
          icon={<MousePointerClick className="size-5" />}
          divider
        />
        <Stat
          label="Total de eventos"
          value={totalEvents}
          icon={<Activity className="size-5" />}
          divider
        />
      </section>

      {/* Top protocolos */}
      <section className="mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">
          Mais consultados
        </p>
        <h2 className="font-serif font-medium text-2xl text-stone-950 mb-6">
          Top protocolos por abertura
        </h2>

        {topProtocols.length > 0 ? (
          <ol className="border-y-2 border-stone-900 divide-y divide-stone-200">
            {topProtocols.map(([id, count], i) => {
              const max = topProtocols[0][1];
              const pct = (count / max) * 100;
              return (
                <li
                  key={id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4 items-center"
                >
                  <span className="lg:col-span-1 font-mono text-sm text-stone-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/admin/protocolos/${id}/editar`}
                    className="lg:col-span-7 font-medium text-stone-900 hover:text-emerald-800 underline underline-offset-2"
                  >
                    {protocolTitleMap.get(id) ?? id.slice(0, 8)}
                  </Link>
                  <div className="lg:col-span-3 h-2 bg-stone-100 relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-800"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="lg:col-span-1 lg:text-right font-mono text-sm text-stone-700">
                    {count}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-stone-500 italic">
            Sem aberturas registradas no período.
          </p>
        )}
      </section>

      {/* Top nós */}
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">
          Onde a atenção está indo
        </p>
        <h2 className="font-serif font-medium text-2xl text-stone-950 mb-6">
          Top nós por clique
        </h2>

        {topNodes.length > 0 ? (
          <ol className="border-y-2 border-stone-900 divide-y divide-stone-200">
            {topNodes.map(([nodeId, data], i) => {
              const max = topNodes[0][1].count;
              const pct = (data.count / max) * 100;
              const protocolTitle = protocolTitleMap.get(data.protocolId);
              return (
                <li
                  key={nodeId}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4 items-center"
                >
                  <span className="lg:col-span-1 font-mono text-sm text-stone-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="lg:col-span-7">
                    <p className="font-medium text-stone-900">
                      {nodeLabelMap.get(nodeId) ?? nodeId.slice(0, 8)}
                    </p>
                    {protocolTitle && (
                      <Link
                        href={`/admin/protocolos/${data.protocolId}/editar`}
                        className="text-xs text-stone-500 hover:text-emerald-800 underline underline-offset-2"
                      >
                        em: {protocolTitle}
                      </Link>
                    )}
                  </div>
                  <div className="lg:col-span-3 h-2 bg-stone-100 relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-800"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="lg:col-span-1 lg:text-right font-mono text-sm text-stone-700">
                    {data.count}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-stone-500 italic">
            Sem cliques em nós registrados no período.
          </p>
        )}
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
    <div className={`p-6 ${divider ? "sm:border-l-2 border-stone-900" : ""}`}>
      <div className="flex items-center justify-between mb-3 text-stone-500">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
          {label}
        </span>
        {icon}
      </div>
      <p
        className={`font-serif font-medium text-5xl tracking-tight leading-none ${accent ? "text-emerald-800" : "text-stone-950"}`}
      >
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
