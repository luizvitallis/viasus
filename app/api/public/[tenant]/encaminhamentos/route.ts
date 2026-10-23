import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReferralData } from "@/types/domain";

export const dynamic = "force-dynamic";

/**
 * Protocolos de encaminhamento PUBLICADOS de um tenant, a partir do snapshot
 * da versão ativa (o mesmo que o visualizador público usa). Consumido pela
 * extensão ViaSus do e-SUS PEC, que casa `especialidade_sisreg` com o campo
 * "Especialidade" do formulário de encaminhamento.
 *
 * Público por design (mesma regra do visualizador: leitura aberta por tenant,
 * RLS anon só enxerga published). Sem dado de paciente.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface RouteContext {
  params: Promise<{ tenant: string }>;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { tenant } = await params;
  const supabase = await createClient();

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, name, subdomain")
    .eq("subdomain", tenant)
    .maybeSingle();
  if (!tenantRow) {
    return NextResponse.json(
      { error: "Município não encontrado." },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const { data: protocols, error } = await supabase
    .from("protocols")
    .select("id, title, slug, active_version_id")
    .eq("tenant_id", tenantRow.id)
    .eq("type", "encaminhamento")
    .eq("status", "published");
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const versionIds = (protocols ?? [])
    .map((p) => p.active_version_id)
    .filter((id): id is string => Boolean(id));

  const { data: versions } = versionIds.length
    ? await supabase
        .from("protocol_versions")
        .select("id, version_number, published_at, graph")
        .in("id", versionIds)
    : { data: [] };
  const versionsById = new Map((versions ?? []).map((v) => [v.id, v]));

  const items = (protocols ?? []).flatMap((p) => {
    const version = p.active_version_id
      ? versionsById.get(p.active_version_id)
      : undefined;
    const referral = (version?.graph as { referral_data?: ReferralData } | null)
      ?.referral_data;
    if (!version || !referral) return [];
    return [
      {
        id: p.id,
        title: p.title,
        slug: p.slug,
        especialidade_sisreg: referral.especialidade_sisreg ?? null,
        version_number: version.version_number,
        published_at: version.published_at,
        referral_data: referral,
      },
    ];
  });

  return NextResponse.json(
    {
      tenant: { name: tenantRow.name, subdomain: tenantRow.subdomain },
      protocols: items,
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
