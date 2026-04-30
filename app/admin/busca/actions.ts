"use server";

import { createClient } from "@/lib/supabase/server";

export interface ProtocolHit {
  kind: "protocol";
  id: string;
  title: string;
  slug: string;
  type: string;
  specialty: string | null;
  status: string;
}

export interface NodeHit {
  kind: "node";
  id: string;
  label: string;
  type: string;
  protocolId: string;
  protocolTitle: string;
  protocolSlug: string;
}

export interface SearchResults {
  protocols: ProtocolHit[];
  nodes: NodeHit[];
}

const MIN_QUERY_LEN = 2;
const LIMIT = 8;

/**
 * Busca full-text PT-BR sobre `search_vector` de protocols e nodes do tenant.
 * Usa o operador `@@` via .textSearch() do supabase-js (config: 'portuguese',
 * type: 'plain' = plainto_tsquery).
 */
export async function searchTenantContent(query: string): Promise<SearchResults> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LEN) {
    return { protocols: [], nodes: [] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { protocols: [], nodes: [] };

  const [{ data: protoRows }, { data: nodeRows }] = await Promise.all([
    supabase
      .from("protocols")
      .select("id, title, slug, type, specialty, status")
      .textSearch("search_vector", trimmed, {
        config: "portuguese",
        type: "plain",
      })
      .limit(LIMIT),
    supabase
      .from("nodes")
      .select("id, label, type, protocol_id")
      .textSearch("search_vector", trimmed, {
        config: "portuguese",
        type: "plain",
      })
      .limit(LIMIT),
  ]);

  // Resolver títulos dos protocolos pais para os hits de nós
  const parentIds = [
    ...new Set((nodeRows ?? []).map((n) => n.protocol_id)),
  ];
  const parentTitles = new Map<string, { title: string; slug: string }>();
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from("protocols")
      .select("id, title, slug")
      .in("id", parentIds);
    for (const p of parents ?? []) {
      parentTitles.set(p.id, { title: p.title, slug: p.slug });
    }
  }

  return {
    protocols: (protoRows ?? []).map<ProtocolHit>((p) => ({
      kind: "protocol",
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: p.type,
      specialty: p.specialty,
      status: p.status,
    })),
    nodes: (nodeRows ?? [])
      .map<NodeHit | null>((n) => {
        const parent = parentTitles.get(n.protocol_id);
        if (!parent) return null;
        return {
          kind: "node",
          id: n.id,
          label: n.label,
          type: n.type,
          protocolId: n.protocol_id,
          protocolTitle: parent.title,
          protocolSlug: parent.slug,
        };
      })
      .filter((x): x is NodeHit => x !== null),
  };
}
