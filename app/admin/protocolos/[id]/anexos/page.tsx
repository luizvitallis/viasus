import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  attachmentIcon,
  formatBytes,
  publicAttachmentUrl,
} from "@/lib/storage";
import { UploadForm } from "./upload-form";
import { DeleteButton } from "./delete-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Anexos — ViaSus",
};

export default async function AnexosPage({ params }: PageProps) {
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

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, title, tenant_id")
    .eq("id", id)
    .single();
  if (!protocol) notFound();
  if (protocol.tenant_id !== profile.tenant_id) notFound();

  const canEdit = ["curador", "publicador", "gestor", "admin"].includes(
    profile.role,
  );

  const { data: attachments } = await supabase
    .from("attachments")
    .select(
      "id, filename, storage_path, mime_type, size_bytes, uploaded_at, uploaded_by",
    )
    .eq("protocol_id", id)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/admin/protocolos/${id}/editar`}
        className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 mb-6 font-mono uppercase tracking-[0.14em]"
      >
        <ArrowLeft className="size-4" />
        Voltar ao editor
      </Link>

      <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
        Documentos anexados
      </p>
      <h1 className="font-serif font-semibold text-3xl sm:text-4xl text-stone-950 mb-2">
        Anexos
      </h1>
      <p className="text-stone-600 mb-10">{protocol.title}</p>

      {canEdit && (
        <section className="mb-12 border-2 border-stone-900">
          <div className="bg-stone-100 border-b-2 border-stone-900 px-6 py-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">
              Anexar arquivo
            </p>
          </div>
          <div className="p-6">
            <UploadForm protocolId={id} />
            <p className="mt-3 text-xs text-stone-500">
              Aceitos: PDF, PNG, JPEG, WebP. Tamanho máximo: 25 MB.
            </p>
          </div>
        </section>
      )}

      <section>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-4">
          {attachments?.length ?? 0} arquivo(s)
        </p>

        {attachments && attachments.length > 0 ? (
          <ol className="border-y-2 border-stone-900 divide-y divide-stone-200">
            {attachments.map((a) => {
              const icon = attachmentIcon(a.mime_type);
              const Icon =
                icon === "pdf" ? FileText : icon === "image" ? ImageIcon : FileIcon;
              const url = publicAttachmentUrl(a.storage_path);
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-4 items-center"
                >
                  <div className="sm:col-span-1">
                    <Icon
                      className={`size-6 ${icon === "pdf" ? "text-red-700" : icon === "image" ? "text-stone-700" : "text-stone-500"}`}
                    />
                  </div>
                  <div className="sm:col-span-6 min-w-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener"
                      className="font-medium text-stone-900 hover:text-emerald-800 underline underline-offset-2 truncate block"
                    >
                      {a.filename}
                    </a>
                    <p className="text-xs text-stone-500 font-mono">
                      {a.mime_type} · {formatBytes(a.size_bytes)}
                    </p>
                  </div>
                  <div className="sm:col-span-3 text-sm text-stone-500 font-mono">
                    {new Date(a.uploaded_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center justify-center size-9 border-2 border-stone-300 hover:border-stone-900 text-stone-700 transition-colors"
                      title="Baixar"
                    >
                      <Download className="size-4" />
                    </a>
                    {canEdit && (
                      <DeleteButton attachmentId={a.id} filename={a.filename} />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="border-2 border-dashed border-stone-300 px-6 py-12 text-center">
            <p className="font-serif text-2xl text-stone-700 mb-2">
              Nenhum anexo ainda.
            </p>
            <p className="text-stone-500">
              Use o formulário acima para anexar PDFs, imagens ou outros
              documentos de referência.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
