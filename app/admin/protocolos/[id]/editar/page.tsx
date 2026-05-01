import { notFound, redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { ProtocolEditor } from "@/components/editor/protocol-editor";
import { ReferralEditor } from "@/components/editor/referral-editor";
import type { EdgeStyle, NodeType, ReferralData } from "@/types/domain";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editor — ViaSus",
};

export default async function EditarProtocoloPage({ params }: PageProps) {
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

  if (!["curador", "publicador", "gestor", "admin"].includes(profile.role)) {
    return (
      <div className="mx-auto max-w-4xl p-12">
        <p className="text-destructive font-medium">
          Seu papel ({profile.role}) não tem permissão para editar protocolos.
        </p>
      </div>
    );
  }

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, title, slug, type, status, tenant_id, referral_data")
    .eq("id", id)
    .single();
  if (!protocol) notFound();
  if (protocol.tenant_id !== profile.tenant_id) notFound();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("subdomain")
    .eq("id", protocol.tenant_id)
    .single();

  // Dispatch por tipo:
  // - encaminhamento  → ReferralEditor (checklist hierárquico)
  // - outros          → ProtocolEditor (xyflow)
  if (protocol.type === "encaminhamento") {
    return (
      <ReferralEditor
        protocolId={protocol.id}
        protocolMeta={{
          title: protocol.title,
          type: protocol.type,
          status: protocol.status,
          slug: protocol.slug,
        }}
        tenantSubdomain={tenant?.subdomain ?? ""}
        userRole={profile.role}
        initialData={(protocol.referral_data as ReferralData | null) ?? null}
      />
    );
  }

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase
      .from("nodes")
      .select(
        "id, type, label, position_x, position_y, content, tags, documento_categoria, documento_acao, documento_link, color_bg, color_border",
      )
      .eq("protocol_id", id),
    supabase
      .from("edges")
      .select(
        "id, source_node_id, target_node_id, label, style, condition_expr, color_stroke",
      )
      .eq("protocol_id", id),
  ]);

  return (
    <>
      <Toaster position="bottom-center" richColors closeButton />
      <ProtocolEditor
        protocolId={protocol.id}
        protocolMeta={{
          title: protocol.title,
          type: protocol.type,
          status: protocol.status,
          slug: protocol.slug,
        }}
        tenantSubdomain={tenant?.subdomain ?? ""}
        userRole={profile.role}
        initialNodes={(nodes ?? []).map((n) => ({
          id: n.id,
          type: n.type as NodeType,
          label: n.label,
          position_x: n.position_x,
          position_y: n.position_y,
          content: n.content,
          tags: Array.isArray(n.tags) ? (n.tags as string[]) : [],
          documento_categoria:
            (n as { documento_categoria?: string | null })
              .documento_categoria ?? null,
          documento_acao:
            (n as { documento_acao?: string | null }).documento_acao ?? null,
          documento_link:
            (n as { documento_link?: string | null }).documento_link ?? null,
          color_bg:
            (n as { color_bg?: string | null }).color_bg ?? null,
          color_border:
            (n as { color_border?: string | null }).color_border ?? null,
        }))}
        initialEdges={(edges ?? []).map((e) => ({
          id: e.id,
          source_node_id: e.source_node_id,
          target_node_id: e.target_node_id,
          label: e.label,
          style: e.style as EdgeStyle,
          condition_expr: e.condition_expr,
          color_stroke:
            (e as { color_stroke?: string | null }).color_stroke ?? null,
        }))}
      />
    </>
  );
}
