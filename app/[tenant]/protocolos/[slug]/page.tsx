import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  File as FileIcon,
  FileText,
  HeartPulse,
  Image as ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProtocolViewer } from "@/components/viewer/protocol-viewer";
import { ReferralViewer } from "@/components/viewer/referral-viewer";
import {
  attachmentIcon,
  formatBytes,
  publicAttachmentUrl,
} from "@/lib/storage";
import {
  PROTOCOL_TYPE_LABEL,
  type EdgeStyle,
  type NodeType,
  type ReferralData,
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
  documento_categoria?: string | null;
  documento_acao?: string | null;
  documento_link?: string | null;
  color_bg?: string | null;
  color_border?: string | null;
}

interface SnapshotEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  style: string;
  condition_expr: unknown;
  color_stroke?: string | null;
}

interface Snapshot {
  nodes?: SnapshotNode[];
  edges?: SnapshotEdge[];
  referral_data?: ReferralData | null;
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

  // Anexos do protocolo (RLS 0004 permite anon SELECT em anexos de published)
  const { data: attachments } = await supabase
    .from("attachments")
    .select("id, filename, storage_path, mime_type, size_bytes")
    .eq("protocol_id", protocol.id)
    .order("uploaded_at", { ascending: true });

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Top bar institucional */}
      <header className="bg-[var(--color-caucaia-red)] text-white sticky top-0 z-10">
        <div className="h-0.5 bg-gradient-to-r from-[var(--color-caucaia-red)] via-stone-700 to-emerald-700" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-[11px] font-mono uppercase tracking-[0.18em]">
          <Link
            href={`/${tenant}`}
            className="inline-flex items-center gap-1.5 hover:text-white/80 transition-colors min-w-0"
          >
            <ArrowLeft className="size-3.5 shrink-0" />
            <span className="truncate">{tenantRow.name}</span>
          </Link>
          <span className="text-white/75 hidden sm:inline shrink-0 flex items-center gap-1.5">
            <HeartPulse className="size-3 text-white" />
            visualizador público
          </span>
        </div>
      </header>

      {/* Cabeçalho mínimo do protocolo — uma linha em desktop, foco é o canvas */}
      <section className="border-b-2 border-stone-900 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 shrink-0">
              <span className="inline-block w-4 h-px bg-[var(--color-caucaia-red)] align-middle mr-1.5" />
              {PROTOCOL_TYPE_LABEL[protocol.type as keyof typeof PROTOCOL_TYPE_LABEL] ?? protocol.type}
              {protocol.specialty ? ` · ${protocol.specialty}` : ""}
            </p>
            <h1 className="font-serif font-semibold text-base sm:text-lg text-stone-950 leading-tight flex-1 min-w-0">
              {protocol.title}
            </h1>
            {protocol.summary && (
              <details className="group shrink-0">
                <summary className="cursor-pointer hover:text-stone-900 list-none marker:hidden font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  <span className="group-open:hidden">ver resumo</span>
                  <span className="hidden group-open:inline">ocultar</span>
                  <span className="ml-1 text-stone-400 group-open:rotate-90 inline-block transition-transform">
                    ›
                  </span>
                </summary>
                <p className="mt-2 text-sm text-stone-700 max-w-3xl leading-relaxed">
                  {protocol.summary}
                </p>
              </details>
            )}
          </div>
        </div>
      </section>

      {/* Canvas — dispatch por tipo:
            - encaminhamento → ReferralViewer (checklist + gerador de texto)
            - outros         → ProtocolViewer (xyflow read-only) */}
      {protocol.type === "encaminhamento" ? (
        snapshot.referral_data ? (
          <ReferralViewer
            tenantId={tenantRow.id}
            protocolId={protocol.id}
            versionId={protocol.active_version_id ?? null}
            data={snapshot.referral_data}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="border-2 border-dashed border-stone-300 px-6 py-12 text-center max-w-md">
              <p className="font-serif text-2xl text-stone-700 mb-2">
                Este protocolo ainda não tem itens publicados.
              </p>
              <p className="text-stone-500">Volte em breve.</p>
            </div>
          </div>
        )
      ) : (
        (() => {
          const rawNodes = snapshot.nodes ?? [];
          // Normaliza coordenadas: o canto superior-esquerdo do grafo
          // sempre vira (0, 0). Combinado com defaultViewport no client,
          // garante que o início do fluxograma sempre aparece sem cropping.
          const offsetX = rawNodes.length
            ? Math.min(...rawNodes.map((n) => n.position_x))
            : 0;
          const offsetY = rawNodes.length
            ? Math.min(...rawNodes.map((n) => n.position_y))
            : 0;
          return (
            <ProtocolViewer
              tenantId={tenantRow.id}
              protocolId={protocol.id}
              versionId={protocol.active_version_id ?? null}
              nodes={rawNodes.map((n) => ({
                id: n.id,
                type: n.type as NodeType,
                label: n.label,
                position_x: n.position_x - offsetX,
                position_y: n.position_y - offsetY,
                content: n.content,
                tags: Array.isArray(n.tags) ? n.tags : [],
                documento_categoria: n.documento_categoria ?? null,
                documento_acao: n.documento_acao ?? null,
                documento_link: n.documento_link ?? null,
                color_bg: n.color_bg ?? null,
                color_border: n.color_border ?? null,
              }))}
              edges={(snapshot.edges ?? []).map((e) => ({
                id: e.id,
                source_node_id: e.source_node_id,
                target_node_id: e.target_node_id,
                label: e.label,
                style: e.style as EdgeStyle,
                color_stroke: e.color_stroke ?? null,
              }))}
            />
          );
        })()
      )}

      {/* Anexos */}
      {attachments && attachments.length > 0 && (
        <section className="border-t-2 border-stone-900 bg-stone-50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-4">
              Documentos anexados
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((a) => {
                const icon = attachmentIcon(a.mime_type);
                const Icon =
                  icon === "pdf"
                    ? FileText
                    : icon === "image"
                      ? ImageIcon
                      : FileIcon;
                const url = publicAttachmentUrl(a.storage_path);
                return (
                  <li key={a.id}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-3 px-4 py-3 border-2 border-stone-300 hover:border-stone-900 hover:bg-white transition-colors group"
                    >
                      <Icon
                        className={`size-5 shrink-0 ${icon === "pdf" ? "text-red-700" : "text-stone-700"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 truncate group-hover:text-emerald-800 transition-colors">
                          {a.filename}
                        </p>
                        <p className="text-xs text-stone-500 font-mono">
                          {a.mime_type} · {formatBytes(a.size_bytes)}
                        </p>
                      </div>
                      <Download className="size-4 text-stone-400 group-hover:text-emerald-800 transition-colors" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Rodapé com info da versão */}
      <footer className="border-t-2 border-stone-900 bg-stone-100">
        <div className="h-1 bg-gradient-to-r from-[var(--color-caucaia-red)] via-stone-500 to-stone-900" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono uppercase tracking-[0.14em] text-stone-600">
          <div>
            <p className="text-stone-900 font-medium flex items-center gap-2">
              <HeartPulse className="size-3.5 text-[var(--color-caucaia-red)]" />
              ViaSus
            </p>
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
