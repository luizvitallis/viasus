/**
 * Teste de isolamento entre tenants — proteção fundamental do sistema.
 *
 * Uso: `pnpm test:rls`
 *
 * Cenário:
 *   1. Faz signin com `gestor.caucaia@viasus.test` (tenant caucaia-ce).
 *   2. Lê `tenants` → deve ver APENAS o tenant caucaia-ce.
 *   3. Lê `protocols` → deve ver o protocolo seed de caucaia.
 *   4. Lê `profiles` → deve ver apenas profiles do tenant caucaia-ce.
 *   5. Tenta um INSERT em protocols com tenant_id do tenant DEMO →
 *      deve ser bloqueado pela policy.
 *
 * Falhar qualquer asserção = bug crítico (vazamento entre tenants).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.error("✖ Faltam env vars no .env.local");
  process.exit(1);
}

const TENANT_DEMO_ID = "11111111-0000-0000-0000-000000000002";
const TEST_PASSWORD = "ViaSus2026!";

let failures = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

async function main() {
  console.log("Teste de isolamento entre tenants\n");

  // Cliente "anon" — RLS aplica como usuário autenticado quando logamos
  const supabase = createClient<Database>(url!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("→ signin como gestor de Caucaia");
  const { error: signinErr } = await supabase.auth.signInWithPassword({
    email: "gestor.caucaia@viasus.test",
    password: TEST_PASSWORD,
  });
  if (signinErr) {
    console.error("✖ login falhou:", signinErr.message);
    process.exit(1);
  }
  console.log("  ✓ logado");

  // 1. tenants — deve ver apenas o caucaia
  const { data: tenants, error: tErr } = await supabase
    .from("tenants")
    .select("id, subdomain");
  if (tErr) console.error("  ✖ erro select tenants:", tErr.message);
  assert(
    tenants?.length === 1 && tenants[0].subdomain === "caucaia-ce",
    "tenants visíveis: apenas caucaia-ce",
    `viu ${tenants?.length ?? 0} tenants: ${JSON.stringify(tenants?.map((t) => t.subdomain))}`,
  );

  // 2. protocols — deve ver o seed de caucaia
  const { data: protocols, error: pErr } = await supabase
    .from("protocols")
    .select("id, slug, tenant_id");
  if (pErr) console.error("  ✖ erro select protocols:", pErr.message);
  assert(
    protocols?.length === 1 && protocols[0].slug === "linha-cuidado-dm2-aps",
    "protocols visíveis: apenas DM2 de caucaia",
    `viu ${protocols?.length ?? 0} protocolos`,
  );

  // 3. profiles — deve ver apenas os 2 profiles de caucaia
  const { data: profiles, error: prErr } = await supabase
    .from("profiles")
    .select("id, email, tenant_id");
  if (prErr) console.error("  ✖ erro select profiles:", prErr.message);
  assert(
    profiles?.length === 2 &&
      profiles.every((p) => p.email?.includes(".caucaia@")),
    "profiles visíveis: apenas os 2 de caucaia",
    `viu ${profiles?.length ?? 0} profiles`,
  );

  // 4. INSERT atravessando tenant — deve ser bloqueado
  const { error: crossErr } = await supabase.from("protocols").insert({
    tenant_id: TENANT_DEMO_ID,
    type: "pop",
    title: "Tentativa de cross-tenant",
    slug: "cross-tenant-attempt",
  });
  assert(
    crossErr !== null,
    "INSERT cross-tenant é bloqueado pela RLS",
    crossErr ? `bloqueado com: ${crossErr.code ?? crossErr.message}` : "passou indevidamente!",
  );

  await supabase.auth.signOut();

  console.log(`\n${failures === 0 ? "✔" : "✖"} ${failures} falha(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n✖ Erro inesperado:", err);
  process.exit(1);
});
