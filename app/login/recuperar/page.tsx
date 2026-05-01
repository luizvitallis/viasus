import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata = {
  title: "Recuperar senha — ViaSus",
};

export default function RecuperarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="bg-[var(--color-caucaia-red)] text-white">
        <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em]">
          <Link href="/login" className="hover:text-white/80 transition-colors">
            ViaSus · voltar ao login
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
            Recuperação de acesso
          </p>
          <h1 className="font-serif font-semibold text-3xl text-stone-950 mb-2">
            Receber link por email
          </h1>
          <p className="text-stone-600 mb-8">
            Informe seu email institucional. Vamos enviar um link mágico para você
            entrar e redefinir a senha.
          </p>

          <ResetForm />

          <p className="mt-8 text-sm text-stone-600">
            Lembrou da senha?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-4"
            >
              Voltar ao login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
