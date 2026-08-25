import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AcervoBrowser } from "./acervo-browser";

export const metadata = {
  title: "Protocolos — ViaSus",
};

interface AcervoProtocol {
  id: string;
  title: string;
  slug: string;
  type: string;
  specialty: string | null;
  summary: string | null;
  status: string;
  updated_at: string;
}

export default async function ProtocolosPage() {
  const supabase = await createClient();

  // RLS já limita ao tenant do usuário. Filtros (status/categoria/busca) são
  // aplicados no cliente para resposta instantânea.
  const { data } = await supabase
    .from("protocols")
    .select("id, title, slug, type, specialty, summary, status, updated_at");
  const protocols = (data ?? []) as AcervoProtocol[];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
            Acervo do tenant
          </p>
          <h1 className="font-serif font-semibold text-4xl text-stone-950">
            Protocolos
          </h1>
        </div>
        <Link
          href="/admin/protocolos/novo"
          className="inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-stone-50 font-medium px-6 h-11 transition-colors w-fit"
        >
          <Plus className="size-4" />
          Novo protocolo
        </Link>
      </div>

      {protocols.length > 0 ? (
        <AcervoBrowser protocols={protocols} />
      ) : (
        <div className="border-2 border-dashed border-stone-300 px-6 py-16 text-center">
          <p className="font-serif text-2xl text-stone-700 mb-2">
            Nenhum protocolo ainda.
          </p>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Comece criando um rascunho. Você pode editar o fluxograma a qualquer
            momento e só publicar quando estiver pronto.
          </p>
          <Link
            href="/admin/protocolos/novo"
            className="inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-stone-50 font-medium px-6 h-11 transition-colors"
          >
            <Plus className="size-4" />
            Criar primeiro protocolo
          </Link>
        </div>
      )}
    </div>
  );
}
