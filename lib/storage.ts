/**
 * Helpers para o bucket Supabase Storage `protocol-attachments`.
 *
 * O bucket é público (qualquer um com URL acessa). A listagem de quais
 * arquivos existem por protocolo é controlada pela tabela `attachments` (RLS).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function publicAttachmentUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/protocol-attachments/${storagePath}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentIcon(mime: string): "pdf" | "image" | "file" {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "file";
}
