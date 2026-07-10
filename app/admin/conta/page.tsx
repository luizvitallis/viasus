import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = {
  title: "Minha conta — ViaSus",
};

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, cpf")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
          Minha conta
        </p>
        <h1 className="font-serif font-semibold text-4xl text-stone-950">
          {profile?.name ?? "Sua conta"}
        </h1>
        <p className="mt-3 text-stone-600 font-mono text-sm">
          {profile?.email}
        </p>
      </div>

      <section className="border-2 border-stone-900">
        <div className="bg-stone-100 border-b-2 border-stone-900 px-6 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-700">
            Trocar senha
          </p>
        </div>
        <div className="p-6">
          <ChangePasswordForm />
        </div>
      </section>

      <p className="mt-6 text-sm text-stone-500">
        Seu CPF e demais dados são gerenciados pelo gestor da sua secretaria.
      </p>
    </div>
  );
}
