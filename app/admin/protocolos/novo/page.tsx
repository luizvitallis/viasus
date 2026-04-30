import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewProtocolForm } from "./new-protocol-form";

export const metadata = {
  title: "Novo protocolo — ViaSus",
};

export default function NovoProtocoloPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/admin/protocolos"
        className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 mb-6 font-mono uppercase tracking-[0.14em]"
      >
        <ArrowLeft className="size-4" />
        Voltar para protocolos
      </Link>

      <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
        Cadastro
      </p>
      <h1 className="font-serif font-semibold text-4xl text-stone-950 mb-3">
        Novo protocolo
      </h1>
      <p className="text-stone-600 max-w-2xl mb-10">
        Crie o cabeçalho do protocolo. Em seguida você é levado direto ao
        editor de fluxograma para construir os nós e arestas.
      </p>

      <div className="border-2 border-stone-900 p-6 sm:p-8 bg-white">
        <NewProtocolForm />
      </div>
    </div>
  );
}
