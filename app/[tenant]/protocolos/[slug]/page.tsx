import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProtocolViewer } from "@/components/viewer/protocol-viewer";
import {
  PROTOCOL_TYPE_LABEL,
  type EdgeStyle,
  type NodeType,
} from "@/types/domain";

interface PageProps {
  params: Promise<{ tenant: string; slug: string }>;
}

interface SnapshotNode {
  id: string;
  type: string;
  label: string;
  position_x: number;
  position_y: number;
  content: unknown;
  tags: string[] | null;
  calculator_type?: string | null;
}

interface SnapshotEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  style: string;
  condition_expr: unknown;
}

interface Snapshot {
  nodes?: SnapshotNode[];
  edges?: SnapshotEdge[];
}

export async function generateMetadata({ params }: PageProps) {
  const { tenant, slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("protocols")
    .select("title, summary, tenant_id, tenants:tenants!inner(name, subdomain)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return { title: "Protocolo não encontrado — ViaSus" };
  // Filter by tenant subdomain (RLS allows reading all tenants for anon,
  // but the protocol's tenant must match the URL tenant)
  const tenantData = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants;
  if (tenantData?.subdomain !== tenant) {
    return { title: "Protocolo não encontrado — ViaSus" };
  }

  return {
    title: `${data.title} — ${tenantData.name} · ViaSus`,
    description:
      data.summary ?? `Protocolo clínico publicado por ${tenantData.name}.`,
  };
}

export default async function ProtocolViewerPage({ params }: PageProps) {
  const { tenant, slug } = await params;
  const supabase = await createClient();

  // Resolve tenant
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, name, subdomain")
    .eq("subdomain", tenant)
    .maybeSingle();
  if (!tenantRow) notFound();

  // Resolve protocol — RLS garante apenas published para anon
  const { data: protocol } = await supabase
    .from("protocols")
    .select(
      "id, title, slug, type, specialty, summary, status, active_version_id, updated_at",
    )
    .eq("tenant_id", tenantRow.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!protocol) notFound();

  // Load active version (snapshot)
  let snapshot: Snapshot = { nodes: [], edges: [] };
  let versionNumber: number | null = null;
  let publishedAt: string | null = null;

  if (protocol.active_version_id) {
    const { data: version } = await supabase
      .from("protocol_versions")
      .select("id, version_number, graph, published_at")
      .eq("id", protocol.active_version_id)
      .maybeSingle();
    if (version) {
      snapshot = (version.graph as Snapshot) ?? { nodes: [], edges: [] };
      versionNumber = version.version_number;
      publishedAt = version.published_at;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Top bar institucional */}
      <header className="bg-stone-950 text-stone-50 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-[11px] font-mono uppercase tracking-[0.18em]">
          <Link
            href={`/${tenant}`}
            className="inline-flex items-center gap-1.5 hover:text-stone-300 transition-colors min-w-0"
          >
            <ArrowLeft className="size-3.5 shrink-0" />
            <span className="truncate">{tenantRow.name}</span>
          </Link>
          <span className="text-stone-400 hidden sm:inline shrink-0">
            visualizador público
          </span>
        </div>
      </header>

      {/* Cabeçalho do protocolo */}
      <section className="border-b-2 border-stone-900 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">
            {PROTOCOL_TYPE_LABEL[protocol.type as keyof typeof PROTOCOL_TYPE_LABEL] ?? protocol.type}
            {protocol.specialty ? ` · ${protocol.specialty}` : ""}
          </p>
          <h1 className="font-serif font-semibold text-3xl sm:text-4xl text-stone-950 leading-tight">
            {protocol.title}
          </h1>
          {protocol.summary && (
            <p className="mt-3 text-stone-700 max-w-3xl leading-relaxed">
              {protocol.summary}
            </p>
          )}
        </div>
      </section>

      {/* Canvas */}
      <ProtocolViewer
        tenantId={tenantRow.id}
        protocolId={protocol.id}
        versionId={protocol.active_version_id ?? null}
        nodes={(snapshot.nodes ?? []).map((n) => ({
          id: n.id,
          type: n.type as NodeType,
          label: n.label,
          position_x: n.position_x,
          position_y: n.position_y,
          content: n.content,
          tags: Array.isArray(n.tags) ? n.tags : [],
        }))}
        edges={(snapshot.edges ?? []).map((e) => ({
          id: e.id,
          source_node_id: e.source_node_id,
          target_node_id: e.target_node_id,
          label: e.label,
          style: e.style as EdgeStyle,
        }))}
      />

      {/* Rodapé com info da versão */}
      <footer className="border-t-2 border-stone-900 bg-stone-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono uppercase tracking-[0.14em] text-stone-600">
          <div>
            <p className="text-stone-900 font-medium">ViaSus</p>
            <p className="mt-1 normal-case tracking-normal text-stone-500 font-sans text-sm">
              {tenantRow.name}
            </p>
          </div>
          <div>
            {versionNumber !== null && <p>Versão {versionNumber}</p>}
            {publishedAt && (
              <p className="mt-1">
                Publicado em{" "}
                {new Date(publishedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
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
