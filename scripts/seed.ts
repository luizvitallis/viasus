/**
 * Seed do ViaSus — popula tenants, usuários, profiles e um protocolo demo.
 *
 * Uso: `pnpm seed`
 *
 * Estratégia:
 *   - Usa a service_role key (bypass RLS).
 *   - É idempotente: pode rodar várias vezes sem duplicar.
 *   - Cria 2 tenants (caucaia-ce e demo) com 2 users cada.
 *   - Popula 1 protocolo "Linha de Cuidado DM2 — APS Caucaia" no tenant
 *     caucaia-ce com 6 nós (cobrindo todos os node_types) e 6 edges
 *     (cobrindo todos os edge_styles).
 *
 * LGPD: emails são fictícios @viasus.test, nada real.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Variáveis vindas de outro lugar (CI, Vercel) — segue o jogo.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error("✖ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY no .env.local");
  process.exit(1);
}

const supabase: SupabaseClient<Database> = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ----------------------------------------------------------------------------
// IDs estáveis — facilitam idempotência e rastreio em logs
// ----------------------------------------------------------------------------
const TENANT_CAUCAIA = "11111111-0000-0000-0000-000000000001";
const TENANT_DEMO = "11111111-0000-0000-0000-000000000002";
const PROTOCOL_DM2 = "22222222-0000-0000-0000-000000000001";

const NODE = {
  abertura: "33333333-0000-0000-0000-000000000001",
  decisao: "33333333-0000-0000-0000-000000000002",
  conduta_int: "33333333-0000-0000-0000-000000000003",
  conduta_term: "33333333-0000-0000-0000-000000000004",
  encaminha: "33333333-0000-0000-0000-000000000005",
  calculadora: "33333333-0000-0000-0000-000000000006",
} as const;

const EDGE = {
  abertura_decisao: "44444444-0000-0000-0000-000000000001",
  decisao_sim: "44444444-0000-0000-0000-000000000002",
  decisao_nao: "44444444-0000-0000-0000-000000000003",
  intermediaria_terminal: "44444444-0000-0000-0000-000000000004",
  intermediaria_encaminha: "44444444-0000-0000-0000-000000000005",
  terminal_calc: "44444444-0000-0000-0000-000000000006",
} as const;

// ATENÇÃO — usuários de TESTE apenas. Senha em texto aqui é proposital
// e nunca deve ir a produção. Re-seedar em prod é proibido.
const TEST_PASSWORD = "ViaSus2026!";

const SEED_USERS = [
  {
    email: "gestor.caucaia@viasus.test",
    name: "Gestor Caucaia (teste)",
    role: "gestor" as const,
    tenant_id: TENANT_CAUCAIA,
  },
  {
    email: "profissional.caucaia@viasus.test",
    name: "Profissional Caucaia (teste)",
    role: "profissional" as const,
    tenant_id: TENANT_CAUCAIA,
  },
  {
    email: "gestor.demo@viasus.test",
    name: "Gestor Demo (teste)",
    role: "gestor" as const,
    tenant_id: TENANT_DEMO,
  },
  {
    email: "profissional.demo@viasus.test",
    name: "Profissional Demo (teste)",
    role: "profissional" as const,
    tenant_id: TENANT_DEMO,
  },
];

function tipTapText(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

async function upsertTenants() {
  console.log("→ Tenants…");
  const { error } = await supabase.from("tenants").upsert(
    [
      { id: TENANT_CAUCAIA, name: "SMS Caucaia / CE", subdomain: "caucaia-ce" },
      { id: TENANT_DEMO, name: "Demo / Sandbox", subdomain: "demo" },
    ],
    { onConflict: "id" },
  );
  if (error) throw error;
  console.log("  ✓ 2 tenants");
}

async function ensureUser(email: string, name: string) {
  // Busca por email (admin.listUsers retorna em batches)
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email === email);

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createErr) throw createErr;
  if (!created.user) throw new Error("createUser não retornou user");
  return created.user.id;
}

async function upsertProfiles() {
  console.log("→ Auth users + profiles…");
  for (const u of SEED_USERS) {
    const userId = await ensureUser(u.email, u.name);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        tenant_id: u.tenant_id,
        email: u.email,
        name: u.name,
        role: u.role,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
    console.log(`  ✓ ${u.email} (${u.role})`);
  }
}

async function upsertProtocolWithGraph() {
  console.log("→ Protocolo seed (Linha de Cuidado DM2)…");

  // Pega o gestor de Caucaia para ser owner_curator
  const { data: gestor, error: gErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", TENANT_CAUCAIA)
    .eq("role", "gestor")
    .single();
  if (gErr) throw gErr;

  const { error: protoErr } = await supabase.from("protocols").upsert(
    {
      id: PROTOCOL_DM2,
      tenant_id: TENANT_CAUCAIA,
      type: "linha_cuidado",
      title: "Linha de Cuidado DM2 — APS Caucaia",
      slug: "linha-cuidado-dm2-aps",
      specialty: "Endocrinologia",
      summary:
        "Itinerário terapêutico para Diabetes Mellitus tipo 2 na Atenção Primária à Saúde do município de Caucaia. Cobre rastreio, diagnóstico, estratificação de risco, manejo inicial e critérios de encaminhamento.",
      status: "draft",
      tags: ["dm2", "endocrinologia", "aps", "linha-de-cuidado"],
      owner_curator_id: gestor.id,
      created_by: gestor.id,
    },
    { onConflict: "id" },
  );
  if (protoErr) throw protoErr;

  // Limpa nodes/edges antigos do protocolo (re-seed limpo)
  await supabase.from("edges").delete().eq("protocol_id", PROTOCOL_DM2);
  await supabase.from("nodes").delete().eq("protocol_id", PROTOCOL_DM2);

  const nodes = [
    {
      id: NODE.abertura,
      type: "ponto_atencao" as const,
      label: "Paciente na UBS com suspeita ou diagnóstico de DM2",
      position_x: 0,
      position_y: 0,
      content: tipTapText(
        "Ponto de entrada: profissional da APS recebe paciente com fatores de risco (idade ≥ 35a, IMC ≥ 25, HF, sedentarismo) ou já diagnosticado.",
      ),
    },
    {
      id: NODE.decisao,
      type: "decisao" as const,
      label: "Glicemia de jejum ≥ 126 mg/dL OU HbA1c ≥ 6,5%?",
      position_x: 240,
      position_y: 0,
      content: tipTapText(
        "Confirmar com 2 exames distintos. Considerar TOTG-75g em casos duvidosos.",
      ),
    },
    {
      id: NODE.conduta_int,
      type: "conduta_intermediaria" as const,
      label: "Estratificar risco e solicitar exames de base",
      position_x: 480,
      position_y: -120,
      content: tipTapText(
        "Solicitar: HbA1c, perfil lipídico, função renal (creatinina + EAS), microalbuminúria, ECG, fundoscopia.",
      ),
    },
    {
      id: NODE.conduta_term,
      type: "conduta_terminal" as const,
      label: "Iniciar metformina 500mg 12/12h após refeição",
      position_x: 720,
      position_y: -240,
      content: tipTapText(
        "Titular para 850mg 12/12h em 4 semanas, conforme tolerância. Reavaliar HbA1c em 3 meses.",
      ),
    },
    {
      id: NODE.encaminha,
      type: "encaminhamento" as const,
      label: "Encaminhar à Endocrinologia",
      position_x: 720,
      position_y: 0,
      content: tipTapText(
        "Critérios: HbA1c > 9% após 6 meses de tratamento otimizado, complicações em órgão-alvo, suspeita de DM tipo 1 ou MODY.",
      ),
    },
    {
      id: NODE.calculadora,
      type: "calculadora" as const,
      label: "Calcular risco cardiovascular (ASCVD 10 anos)",
      position_x: 960,
      position_y: -240,
      content: tipTapText(
        "Calculadora ACC/AHA. Risco ≥ 7,5% indica estatina de moderada/alta intensidade.",
      ),
      calculator_type: "ascvd_10y",
    },
  ];

  const { error: nodesErr } = await supabase.from("nodes").insert(
    nodes.map((n) => ({ ...n, protocol_id: PROTOCOL_DM2, tenant_id: TENANT_CAUCAIA })),
  );
  if (nodesErr) throw nodesErr;

  const edges = [
    {
      id: EDGE.abertura_decisao,
      source_node_id: NODE.abertura,
      target_node_id: NODE.decisao,
      style: "normal" as const,
      label: "Avaliar critério",
    },
    {
      id: EDGE.decisao_sim,
      source_node_id: NODE.decisao,
      target_node_id: NODE.conduta_int,
      style: "condicional" as const,
      label: "Sim, confirmado",
    },
    {
      id: EDGE.decisao_nao,
      source_node_id: NODE.decisao,
      target_node_id: NODE.abertura,
      style: "condicional" as const,
      label: "Não — repetir em 6 meses",
    },
    {
      id: EDGE.intermediaria_terminal,
      source_node_id: NODE.conduta_int,
      target_node_id: NODE.conduta_term,
      style: "normal" as const,
      label: "Risco baixo/moderado",
    },
    {
      id: EDGE.intermediaria_encaminha,
      source_node_id: NODE.conduta_int,
      target_node_id: NODE.encaminha,
      style: "urgente" as const,
      label: "DM descompensado",
    },
    {
      id: EDGE.terminal_calc,
      source_node_id: NODE.conduta_term,
      target_node_id: NODE.calculadora,
      style: "normal" as const,
      label: "Avaliar risco CV",
    },
  ];

  const { error: edgesErr } = await supabase.from("edges").insert(
    edges.map((e) => ({ ...e, protocol_id: PROTOCOL_DM2, tenant_id: TENANT_CAUCAIA })),
  );
  if (edgesErr) throw edgesErr;

  console.log(`  ✓ protocolo + 6 nodes + 6 edges`);
}

async function main() {
  console.log("Seedando ViaSus…\n");
  await upsertTenants();
  await upsertProfiles();
  await upsertProtocolWithGraph();
  console.log("\n✔ Seed concluído.\n");
  console.log("Logins de teste (só dev):");
  for (const u of SEED_USERS) {
    console.log(`  ${u.email}  ·  senha: ${TEST_PASSWORD}`);
  }
}

main().catch((err) => {
  console.error("\n✖ Falhou:", err);
  process.exit(1);
});
