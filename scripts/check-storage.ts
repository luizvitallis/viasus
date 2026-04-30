/**
 * Diagnóstico — verifica se a migration 0005 (bucket protocol-attachments)
 * foi aplicada com sucesso.
 *
 * Uso: `pnpm tsx scripts/check-storage.ts`
 */

import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("✖ Erro listando buckets:", error.message);
    process.exit(1);
  }

  const bucket = buckets?.find((b) => b.id === "protocol-attachments");
  if (!bucket) {
    console.log(
      "✖ Bucket 'protocol-attachments' NÃO encontrado.\n  Aplique a migration 0005_storage_attachments.sql no SQL Editor.",
    );
    process.exit(1);
  }

  console.log("✓ Bucket 'protocol-attachments' existe");
  console.log(`  public: ${bucket.public}`);
  console.log(`  file_size_limit: ${bucket.file_size_limit ?? "—"} bytes`);
  console.log(
    `  allowed_mime_types: ${bucket.allowed_mime_types?.join(", ") ?? "—"}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
