import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WaveHeader } from "@/components/decorations/wave-header";
import { HealthPattern } from "@/components/decorations/health-pattern";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar — ViaSus",
  description: "Acesso ao painel de administração de protocolos do ViaSus.",
};

export default async function LoginPage() {
  // Já logado? Vai direto pra área admin.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/admin/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <WaveHeader />

      {/* Barra institucional */}
      <header className="bg-[var(--color-caucaia-red)] text-white">
        <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em]">
          <Link href="/" className="hover:text-white/80 transition-colors flex items-center gap-2">
            <HeartPulse className="size-3.5 text-white" />
            ViaSus · voltar à página inicial
          </Link>
          <span className="hidden sm:inline text-white/75">acesso restrito</span>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2">
        {/* Coluna informativa (some no mobile) */}
        <aside className="relative hidden lg:flex flex-col justify-between border-r-2 border-stone-900 p-12 bg-stone-100 overflow-hidden">
          <HealthPattern opacity={0.05} />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
              <span className="inline-block w-6 h-px bg-[var(--color-caucaia-red)] align-middle mr-2" />
              Painel de administração
            </p>
            <h1 className="mt-6 font-serif font-medium text-4xl text-stone-950 leading-tight">
              Curadoria, edição e publicação de protocolos.
            </h1>
            <p className="mt-6 text-stone-700 leading-relaxed max-w-md">
              Esta área é restrita a profissionais autorizados. O acesso é por convite
              do gestor — não há autocadastro. Se você precisa de acesso, fale com a
              gestão da Atenção Especializada.
            </p>
          </div>
          <dl className="font-mono text-[13px] text-stone-700 space-y-3 max-w-sm">
            <div className="flex justify-between border-b border-stone-300 pb-2">
              <dt className="uppercase tracking-[0.14em] text-stone-500">Tenant</dt>
              <dd>Caucaia / CE</dd>
            </div>
            <div className="flex justify-between border-b border-stone-300 pb-2">
              <dt className="uppercase tracking-[0.14em] text-stone-500">Acesso público</dt>
              <dd>
                <Link href="/caucaia-ce" className="underline underline-offset-4 hover:text-emerald-800">
                  /caucaia-ce
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="uppercase tracking-[0.14em] text-stone-500">Estágio</dt>
              <dd>Fase 2 · Auth</dd>
            </div>
          </dl>
        </aside>

        {/* Coluna de formulário */}
        <section className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
              Identificação
            </p>
            <h2 className="font-serif font-semibold text-3xl text-stone-950 mb-2">
              Entrar
            </h2>
            <p className="text-stone-600 mb-8">
              Use o email cadastrado pelo gestor da sua secretaria.
            </p>

            <LoginForm />

            <p className="mt-8 text-sm text-stone-600">
              Esqueceu a senha?{" "}
              <Link
                href="/login/recuperar"
                className="font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-4"
              >
                Receba um link por email
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
